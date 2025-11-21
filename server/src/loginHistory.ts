import { db } from "./db";

export type LoginHistoryRow = {
  id: number;
  userId: number | null;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  success: number; // 1 = success, 0 = failure
  createdAt: string;
  metadataJson: string | null;
};

function ensureLoginHistorySchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS loginHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      email TEXT,
      ip TEXT,
      userAgent TEXT,
      method TEXT,
      success INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      metadataJson TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}

ensureLoginHistorySchema();

export function recordLoginAttempt(params: {
  userId?: number | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  method?: string | null; // e.g. "password", "oauth-google", etc.
  success: boolean;
  metadata?: Record<string, any>;
}) {
  const now = new Date().toISOString();
  const { userId, email, ip, userAgent, method, success, metadata } = params;

  let metadataJson: string | null = null;
  if (metadata) {
    try {
      metadataJson = JSON.stringify(metadata);
    } catch {
      metadataJson = null;
    }
  }

  db.prepare(
    `INSERT INTO loginHistory
      (userId, email, ip, userAgent, method, success, createdAt, metadataJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId ?? null,
    email ?? null,
    ip ?? null,
    userAgent ?? null,
    method ?? null,
    success ? 1 : 0,
    now,
    metadataJson
  );
}

export function listLoginHistoryForUser(
  userId: number,
  limit = 100
): LoginHistoryRow[] {
  const rows = db
    .prepare(
      `SELECT id, userId, email, ip, userAgent, method, success, createdAt, metadataJson
       FROM loginHistory
       WHERE userId = ?
          OR (userId IS NULL AND email IS NOT NULL AND email = (
                SELECT email FROM users WHERE id = ?
             ))
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .all(userId, userId, limit) as LoginHistoryRow[];

  return rows;
}
