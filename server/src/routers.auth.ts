
// PASSWORD HISTORY START
import { db } from "./db.js";
import crypto from "crypto";

function hash(p) {
  return crypto.createHash("sha256").update(p).digest("hex");
}

// Reject old password reuse
function isPasswordReused(userId, newHash) {
  const rows = db.prepare("SELECT passwordHash FROM passwordHistory WHERE userId=?").all(userId);
  return rows.some(r => r.passwordHash === newHash);
}

// Add to history
function storePasswordHistory(userId, newHash) {
  db.prepare("INSERT INTO passwordHistory (userId, passwordHash, createdAt) VALUES (?,?,?)")
    .run(userId, newHash, new Date().toISOString());
}
// PASSWORD HISTORY END

import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { createSession, destroySession, listUserSessions, revokeAllOtherSessions, revokeSession } from "./session";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSession, listUserSessions, revokeAllOtherSessions, revokeSession } from "./session";
import { listUserSessions, revokeAllOtherSessions, revokeSession } from "./session";


// ============ Intelligent Login Alert ============

function shouldSendLoginAlert(userId: number, ip: string, ua: string) {
  const row = db.prepare(
    `SELECT lastIp, lastUa FROM users WHERE id=?`
  ).get(userId) as any;

  if (!row) return true;
  if (!row.lastIp || !row.lastUa) return true;

  if (row.lastIp !== ip) return true;
  if (row.lastUa !== ua) return true;

  return false;
}
    

// =============================
// LOGIN ALERT PATCH
// =============================
async function sendLoginAlert(email: string, ip: string, ua: string) {
  console.log("[login-alert] sending alert for", email);
  // In real system: replace with email provider
  // Here: safe console output so tests do not break
}

function isSuspiciousLogin(lastSession: any, ip: string, ua: string) {
  if (!lastSession) return true;
  if (lastSession.ip !== ip) return true;
  if (lastSession.userAgent !== ua) return true;
  return false;
}


// ===============================
// Password History (no reuse)
// ===============================
function checkPasswordReuse(userId: number, newHash: string) {
  const rows = db.prepare(
    "SELECT oldHash FROM passwordHistory WHERE userId=? ORDER BY id DESC LIMIT 5"
  ).all(userId);
  return rows.some(r => r.oldHash === newHash);
}

export const authRouter = router({

  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(({ input }) => {
      const user = db.prepare("SELECT * FROM users WHERE email=?").get(input.email);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return { token: createSession(user.id), user };
    }),

  submitKyc: protectedProcedure
    .input(
      z.object({
        frontUrl: z.string(),
        backUrl: z.string(),
        selfieUrl: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const last = db
        .prepare("SELECT MAX(createdAt) as ts FROM userKycDocuments WHERE userId=?")
        .get(ctx.user.id) as { ts?: string };

      if (last?.ts) {
        const diff = Date.now() - new Date(last.ts).getTime();
        if (diff < 10_000) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait before submitting again.",
          });
        }
      }

      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO userKycDocuments
          (userId, frontUrl, backUrl, selfieUrl, status, createdAt)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      ).run(ctx.user.id, input.frontUrl, input.backUrl, input.selfieUrl, now);

      db.prepare("UPDATE users SET kycStatus='pending' WHERE id=?").run(ctx.user.id);

      return { success: true };
    }),
      // ================================
  // SESSION MANAGEMENT (user side)
  // ================================
  sessionsList: authedProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return listUserSessions(ctx.user.id);
  }),

  sessionsRevoke: authedProcedure
    .input(
      z.object({
        token: z.string().min(10),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const current = getSession(input.token);
      // Optional safety: user can revoke only own sessions
      if (!current || current.id !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      revokeSession(input.token);
      return { success: true };
    }),


});

// ============================
// SMART LOGIN ALERTS
// ============================

import { sendEmail } from "../utils/mailer";

function getFingerprint(ctx: any) {
  return `${ctx.ip || "0.0.0.0"}|${ctx.userAgent || "unknown"}`;
}

async function maybeSendLoginAlert(ctx: any) {
  const fingerprint = getFingerprint(ctx);

  const last = db.prepare(
    "SELECT userAgent, ip FROM sessions WHERE userId=? ORDER BY createdAt DESC LIMIT 1"
  ).get(ctx.user.id);

  const isNewDevice =
    !last || last.userAgent !== ctx.userAgent || last.ip !== ctx.ip;

  if (isNewDevice) {
    await sendEmail(ctx.user.email, "New login detected", `
      A new login has been detected:
      IP: ${ctx.ip}
      Device: ${ctx.userAgent}
      Time: ${new Date().toISOString()}
    `);
  }
}
