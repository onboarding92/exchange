import crypto from "crypto";
import db from "./db";
import { sendEmail } from "./email";

export function generateEmailCode(userId: number) {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expires = Date.now() + 1000 * 60 * 10; // 10 minutes

  db.prepare(`
    INSERT INTO emailVerifications (userId, code, expiresAt)
    VALUES (?, ?, ?)
  `).run(userId, code, expires);

  return code;
}

export function sendVerificationEmail(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: "Verify your BitChange account",
    html: `
      <h1>Your BitChange Verification Code</h1>
      <p>Enter this code to verify your email:</p>
      <h2>${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

export function verifyEmailCode(userId: number, code: string) {
  const entry = db
    .prepare(
      `SELECT * FROM emailVerifications WHERE userId=? AND code=? ORDER BY id DESC`
    )
    .get(userId, code);

  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;

  // mark user verified
  db.prepare(`UPDATE users SET emailVerified=1 WHERE id=?`).run(userId);

  // remove all pending codes
  db.prepare(`DELETE FROM emailVerifications WHERE userId=?`).run(userId);

  return true;
}
