import { db } from "./db";
import crypto from "crypto";

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sessions (token, userId, createdAt)
     VALUES (?, ?, ?)`
  ).run(token, userId, now);

  return token;
}

export function getSession(token: string | undefined | null) {
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.userId as id, u.email, u.role
       FROM sessions s
       JOIN users u ON u.id = s.userId
       WHERE s.token=?`
    )
    .get(token);

  return row || null;
}

export function destroySession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token=?").run(token);
}
