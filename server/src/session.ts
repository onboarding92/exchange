import { db } from "./db";
import crypto from "crypto";

// How long a session is considered valid (30 days)
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

  const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();

  const row = db
    .prepare(
      `SELECT
         s.userId as id,
         u.email,
         u.role,
         s.createdAt
       FROM sessions s
       JOIN users u ON u.id = s.userId
       WHERE s.token = ? AND s.createdAt >= ?`
    )
    .get(token, cutoff) as
    | {
        id: number;
        email: string;
        role: "user" | "admin";
        createdAt: string;
      }
    | undefined;

  if (!row) {
    // Optionally: we could also delete stale sessions here,
    // but the WHERE s.createdAt >= cutoff already ignores expired ones.
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
  };
}

export function destroySession(token: string) {
  // Bugfix: before there was an extra "createdAt>=?" without parameter.
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// =============================
// Session management helpers
// =============================
export type SessionInfo = {
  token: string;
  userId: number;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

/**
 * List all active sessions for a given user.
 * NOTE: This currently lists *all* sessions; if you want TTL here too,
 * you can add "AND createdAt >= cutoff" as in getSession.
 */
export function listUserSessions(userId: number): SessionInfo[] {
  return db
    .prepare(
      `SELECT token, userId, email, role, createdAt
       FROM sessions
       WHERE userId = ?
       ORDER BY createdAt DESC`
    )
    .all(userId) as SessionInfo[];
}

/**
 * Revoke a single session by token.
 */
export function revokeSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
