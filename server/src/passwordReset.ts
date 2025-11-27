import crypto from "crypto";
import db from "./db";
import { sendEmail } from "./email";
import bcrypt from "bcryptjs";

export function requestPasswordReset(email: string) {
  const user = db
    .prepare("SELECT id, email FROM users WHERE email=?")
    .get(email);

  if (!user) return; // hide existence of user

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 1000 * 60 * 15; // 15 minutes

  db.prepare(
    `INSERT INTO passwordResets (userId, token, expiresAt)
     VALUES (?, ?, ?)`
  ).run(user.id, token, expires);

  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  sendEmail({
    to: user.email,
    subject: "Reset your BitChange password",
    html: `
      <h1>Password Reset</h1>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });

  return true;
}

export function resetPassword(token: string, newPassword: string) {
  const row = db
    .prepare(`SELECT * FROM passwordResets WHERE token=? ORDER BY id DESC`)
    .get(token);

  if (!row) return false;
  if (row.expiresAt < Date.now()) return false;

  const hashed = bcrypt.hashSync(newPassword, 10);

  db.prepare(`UPDATE users SET password=? WHERE id=?`).run(hashed, row.userId);
  db.prepare(`DELETE FROM passwordResets WHERE userId=?`).run(row.userId);

  return true;
}
