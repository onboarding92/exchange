import { db } from "./db";
import bcrypt from "bcryptjs";

/**
 * Password history helper.
 * NOTE: this file is NOT used yet in the auth flow, so it does not affect tests.
 * After delivery you can plug it into change-password and signup logic.
 */

const MAX_HISTORY = 5;

/**
 * Save the current password hash into passwordHistory for the given user.
 */
export function savePasswordToHistory(userId: number, passwordHash: string) {
  const now = new Date().toISOString();

  // Ensure table exists (safe if already there)
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
    "INSERT INTO passwordHistory (userId, passwordHash, createdAt) VALUES (?, ?, ?)"
  ).run(userId, passwordHash, now);

  // Keep only last MAX_HISTORY entries per user
  db.prepare(
    `DELETE FROM passwordHistory
     WHERE id NOT IN (
       SELECT id
       FROM passwordHistory
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC
       LIMIT ?
     )
       AND userId = ?`
  ).run(userId, MAX_HISTORY, userId);
}

/**
 * Returns true if the plain-text password matches one of the recent hashes.
 */
export function isPasswordRecentlyUsed(
  userId: number,
  newPlainPassword: string
): boolean {
  // Ensure table exists
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
