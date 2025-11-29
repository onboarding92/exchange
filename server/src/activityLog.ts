import { db } from "./db";

/**
 * Store a security-relevant activity for a user.
 */
export function logActivity(userId: number, action: string, ip?: string) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO activityLogs (userId, action, ip, createdAt)
     VALUES (?, ?, ?, ?)`
  ).run(userId, action, ip || "unknown", now);
}

/**
 * Get last activities for a user (for profile / security center).
 */
export function getActivityForUser(userId: number) {
  return db.prepare(
    `SELECT action, ip, createdAt
     FROM activityLogs
     WHERE userId=?
     ORDER BY createdAt DESC`
  ).all(userId);
}
