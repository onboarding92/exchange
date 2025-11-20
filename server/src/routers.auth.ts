import { router, publicProcedure, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "./session";
import { sendEmail } from "./email";
import { TRPCError } from "@trpc/server";

type AttemptInfo = {
  count: number;
  firstAttempt: number;
};

// Maps for tracking attempts in memory
const loginFailures = new Map<string, AttemptInfo>();
const registerAttempts = new Map<string, AttemptInfo>();

// Helper: get client IP (best effort)
function getClientIp(ctx: { req: any }): string {
  const xf = ctx.req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  const ip = ctx.req.socket?.remoteAddress;
  return typeof ip === "string" ? ip : "unknown";
}

// Generic rate limiter: increments attempts and throws if over limit
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
    // window expired -> reset counter
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

// Helper to clear attempts on successful login
function clearAttempts(map: Map<string, AttemptInfo>, key: string) {
  if (map.has(key)) {
    map.delete(key);
  }
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const now = new Date().toISOString();

      // Basic rate limit on registration per IP+email
      const ip = getClientIp(ctx as any);
      const key = `${ip}:${input.email.toLowerCase()}`;
      // max 5 registrations trials per 15 minutes for the same IP+email
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
        // Do NOT leak if user exists or not (generic error)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to create account. Please try a different email.",
        });
      }
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx as any);
      const key = `${ip}:${input.email.toLowerCase()}`;

      const row = db
        .prepare("SELECT id,email,password,role FROM users WHERE email=?")
        .get(input.email) as any;

      // If no user or no password -> failed attempt
      if (!row || !row.password) {
        // Track failed login attempts (max 5 fails in 10 minutes)
        registerAttempt(loginFailures, key, 5, 10 * 60 * 1000);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const ok = await bcrypt.compare(input.password, row.password);
      if (!ok) {
        // Failed password -> increment failures too
        registerAttempt(loginFailures, key, 5, 10 * 60 * 1000);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Successful login -> clear failed attempts
      clearAttempts(loginFailures, key);

      const token = createSession(row.id, row.email, row.role);
      ctx.res.cookie("session", token, { httpOnly: true, sameSite: "lax" });

      return { user: { id: row.id, email: row.email, role: row.role } };
    }),

  me: publicProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),

  logout: authedProcedure.mutation(({ ctx }) => {
    const token = ctx.req.cookies?.session as string | undefined;
    destroySession(token);
    ctx.res.clearCookie("session");
    return { success: true };
  }),
});
