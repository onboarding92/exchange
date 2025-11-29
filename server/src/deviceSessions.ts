import { db } from "./db";

/**
 * Helpers for device/session management, built on the existing "sessions" table.
 *
 * These functions are NOT wired into the API router yet, so they are safe and
 * do not change any behaviour. They are meant as building blocks for:
 *  - "Active sessions" page in the profile
 *  - "Log out from all devices" button
 *  - Admin tools to inspect user sessions
 */

export type SessionRow = {
  token: string;
  userId: number;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

/**
 * List all sessions for a given userId.
 */
export function listSessionsForUser(userId: number): SessionRow[] {
  const rows = db
    .prepare(
      `SELECT token, userId, email, role, createdAt
       FROM sessions
       WHERE userId = ?
       ORDER BY datetime(createdAt) DESC`
    )
    .all(userId) as SessionRow[];

  return rows;
}

/**
 * Revoke a single session by token.
 * Returns true if something was deleted.
 */
export function revokeSessionByToken(token: string): boolean {
  const info = db
    .prepare("DELETE FROM sessions WHERE token = ?")
    .run(token);

  return info.changes > 0;
}

/**
 * Revoke all sessions for a given userId, optionally keeping the current token.
 */
export function revokeAllSessionsForUser(
  userId: number,
  keepToken?: string
): number {
  if (keepToken) {
    const info = db
      .prepare("DELETE FROM sessions WHERE userId = ? AND token != ?")
      .run(userId, keepToken);
    return info.changes ?? 0;
  }

  const info = db
    .prepare("DELETE FROM sessions WHERE userId = ?")
    .run(userId);
  return info.changes ?? 0;
}
