import { router, publicProcedure, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "./session";
import { sendEmail } from "./email";
import { TRPCError } from "@trpc/server";
import { authenticator } from "otplib";
import {
  getTwoFactor,
  upsertTwoFactor,
  setTwoFactorEnabled,
  disableTwoFactor,
} from "./twoFactor";
import { recordLoginEvent, getRecentLogins } from "./loginEvents";
import { getUserKyc, submitKycDocuments } from "./kyc";

type AttemptInfo = {
  count: number;
  firstAttempt: number;
};

const loginFailures = new Map<string, AttemptInfo>();
const registerAttempts = new Map<string, AttemptInfo>();

function getClientIp(ctx: { req: any }): string {
  const xf = ctx.req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  const ip = ctx.req.socket?.remoteAddress;
  return typeof ip === "string" ? ip : "unknown";
}

function registerAttempt(
  map: Map<string, AttemptInfo>,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry) {
    map.set(key, { count: 1, firstAttempt: now });
    return;
  }
  if (now - entry.firstAttempt > windowMs) {
    map.set(key, { count: 1, firstAttempt: now });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again later.",
    });
  }
}

function clearAttempts(map: Map<string, AttemptInfo>, key: string) {
  if (map.has(key)) {
    map.delete(key);
  }
}

export const authRouter = router({
  // === REGISTER ===
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date().toISOString();
      const ip = getClientIp(ctx as any);
      const key = `${ip}:${input.email.toLowerCase()}`;

      // max 5 registration attempts per 15 minutes per IP+email
      registerAttempt(registerAttempts, key, 5, 15 * 60 * 1000);

      const hash = await bcrypt.hash(input.password, 10);
      try {
        const res = db
          .prepare(
            "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
          )
          .run(input.email, hash, "user", "unverified", now, now);

        await sendEmail(
          input.email,
          "Welcome to BitChange",
          "Your account has been created successfully."
        );

        return { id: res.lastInsertRowid };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to create account. Please try a different email.",
        });
      }
    }),

  // === LOGIN ===
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
        twoFactorCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx as any);
      const key = `${ip}:${input.email.toLowerCase()}`;
      const userAgent =
        typeof ctx.req.headers["user-agent"] === "string"
          ? ctx.req.headers["user-agent"]
          : "unknown";

      const row = db
        .prepare("SELECT id,email,password,role FROM users WHERE email=?")
        .get(input.email) as any;

      if (!row || !row.password) {
        registerAttempt(loginFailures, key, 5, 10 * 60 * 1000);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const ok = await bcrypt.compare(input.password, row.password);
      if (!ok) {
        registerAttempt(loginFailures, key, 5, 10 * 60 * 1000);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const twofa = getTwoFactor(row.id);
      if (twofa && twofa.enabled) {
        if (!input.twoFactorCode) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "TWO_FACTOR_REQUIRED",
          });
        }
        const isValid = authenticator.check(input.twoFactorCode, twofa.secret);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid two-factor code",
          });
        }
      }

      clearAttempts(loginFailures, key);

      const token = createSession(row.id, row.email, row.role);
      ctx.res.cookie("session", token, { httpOnly: true, sameSite: "lax" });

      // Record login event
      recordLoginEvent(row.id, ip, userAgent);

      return { user: { id: row.id, email: row.email, role: row.role } };
    }),

  // === CURRENT USER ===
  me: publicProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),

  // === LOGOUT ===
  logout: authedProcedure.mutation(({ ctx }) => {
    const token = ctx.req.cookies?.session as string | undefined;
    destroySession(token);
    ctx.res.clearCookie("session");
    return { success: true };
  }),

  // === 2FA SETUP: generate secret + QR URL ===
  init2FASetup: authedProcedure.mutation(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const existing = getTwoFactor(ctx.user.id);
    if (existing && existing.enabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is already enabled.",
      });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      ctx.user.email,
      "BitChange Exchange",
      secret
    );

    upsertTwoFactor(ctx.user.id, secret, false);

    return { otpauthUrl, secret };
  }),

  // === 2FA CONFIRM: verify token and enable ===
  confirm2FASetup: authedProcedure
    .input(
      z.object({
        token: z.string().min(6).max(8),
      })
    )
    .mutation(({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const rec = getTwoFactor(ctx.user.id);
      if (!rec) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not initialized.",
        });
      }

      const isValid = authenticator.check(input.token, rec.secret);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid two-factor code.",
        });
      }

      setTwoFactorEnabled(ctx.user.id, true);
      return { success: true };
    }),

  // === 2FA DISABLE: require token to disable ===
  disable2FA: authedProcedure
    .input(
      z.object({
        token: z.string().min(6).max(8),
      })
    )
    .mutation(({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const rec = getTwoFactor(ctx.user.id);
      if (!rec || !rec.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is not enabled.",
        });
      }

      const isValid = authenticator.check(input.token, rec.secret);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid two-factor code.",
        });
      }

      disableTwoFactor(ctx.user.id);
      return { success: true };
    }),

  // === LOGIN HISTORY: recent devices / IPs ===
  loginHistory: authedProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const events = getRecentLogins(ctx.user.id, 20);
    return events;
  }),

  // === KYC STATUS: for current user ===
  kycStatus: authedProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getUserKyc(ctx.user.id);
  }),

  // === KYC SUBMIT: upload doc metadata (fileKey) ===
  submitKyc: authedProcedure
    .input(
      z.object({
        documents: z
          .array(
            z.object({
              type: z.string().min(2).max(50),
              fileKey: z.string().min(1).max(512),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      submitKycDocuments(ctx.user.id, input.documents);

      return { success: true };
    }),
});
