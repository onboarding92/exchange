import crypto from "node:crypto";
import { db } from "./db";

export function createSession(userId: number, email: string, role: "user"|"admin") {
  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO sessions (token,userId,email,role,createdAt) VALUES (?,?,?,?,?)")
    .run(token, userId, email, role, now);
  return token;
}

export function getSession(token: string | undefined | null) {
  if (!token) return null;
  const row = db.prepare("SELECT userId as id, email, role FROM sessions WHERE token=?").get(token);
  if (!row) return null;
  return row as { id: number; email: string; role: "user"|"admin" };
}

export function destroySession(token: string | undefined | null) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token=?").run(token);
}
