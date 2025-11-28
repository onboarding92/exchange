import { db } from "./db";
import bcrypt from "bcryptjs";

/**
 * This module is an isolated helper for password history.
 * It is NOT wired into auth yet (to avoid breaking tests under time pressure).
 * After delivery you can plug it into your password-change flow.
 */

const MAX_HISTORY = 5;

/**
 * Save the new password hash into passwordHistory for the given user.
 * Optionally trim the history to keep only the most recent MAX_HISTORY entries.
 */
export function savePasswordToHistory(userId: number, passwordHash: string) {
  const now = new Date().toISOString();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS passwordHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  ).run();

  db.prepare(
    "INSERT INTO passwordHistory (userId,passwordHash,createdAt) VALUES (?,?,?)"
  ).run(userId, passwordHash, now);

  // Trim history to last MAX_HISTORY entries per user
  db.prepare(
    `DELETE FROM passwordHistory
     WHERE id NOT IN (
       SELECT id FROM passwordHistory
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC
       LIMIT ?
     )
     AND userId = ?`
  ).run(userId, MAX_HISTORY, userId);
}

/**
 * Checks if the given new password (plain text) was recently used.
 * It compares against the stored hashes in passwordHistory.
 */
export function isPasswordRecentlyUsed(
  userId: number,
  newPlainPassword: string
): boolean {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS passwordHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  ).run();

  const rows = db
    .prepare(
      `SELECT passwordHash
       FROM passwordHistory
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC
       LIMIT ?`
    )
    .all(userId, MAX_HISTORY) as { passwordHash: string }[];

  for (const row of rows) {
    if (bcrypt.compareSync(newPlainPassword, row.passwordHash)) {
      return true;
    }
  }
  return false;
}
