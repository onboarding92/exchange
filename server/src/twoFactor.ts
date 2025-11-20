import { db } from "./db";

export type TwoFactorRecord = {
  userId: number;
  secret: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
};

db.prepare(`
  CREATE TABLE IF NOT EXISTS userTwoFactor (
    userId INTEGER PRIMARY KEY,
    secret TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

export function getTwoFactor(userId: number): TwoFactorRecord | undefined {
  return db
    .prepare("SELECT * FROM userTwoFactor WHERE userId=?")
    .get(userId) as any;
}

export function upsertTwoFactor(userId: number, secret: string, enabled: boolean) {
  const now = new Date().toISOString();
  const existing = getTwoFactor(userId);
  if (existing) {
    db.prepare(
      "UPDATE userTwoFactor SET secret=?, enabled=?, updatedAt=? WHERE userId=?"
    ).run(secret, enabled ? 1 : 0, now, userId);
  } else {
    db.prepare(
      `INSERT INTO userTwoFactor (userId,secret,enabled,createdAt,updatedAt)
       VALUES (?,?,?,?,?)`
    ).run(userId, secret, enabled ? 1 : 0, now, now);
  }
}

export function setTwoFactorEnabled(userId: number, enabled: boolean) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE userTwoFactor SET enabled=?, updatedAt=? WHERE userId=?"
  ).run(enabled ? 1 : 0, now, userId);
}

export function disableTwoFactor(userId: number) {
  db.prepare("DELETE FROM userTwoFactor WHERE userId=?").run(userId);
}
