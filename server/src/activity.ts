import { db } from "./db";

export type ActivityLogRow = {
  id: number;
  userId: number | null;
  type: string;      // e.g. "withdrawal", "login", "staking"
  category: string;  // e.g. "security", "wallet", "trading"
  description: string;
  metadataJson: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

function ensureActivitySchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS activityLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      metadataJson TEXT,
      ip TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}

ensureActivitySchema();

export function logActivity(params: {
  userId?: number | null;
  type: string;
  category: string;
  description: string;
  metadata?: Record<string, any>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const now = new Date().toISOString();
  const { userId, type, category, description, metadata, ip, userAgent } = params;

  let metadataJson: string | null = null;
  if (metadata) {
    try {
      metadataJson = JSON.stringify(metadata);
    } catch {
      metadataJson = null;
    }
  }

  db.prepare(
    `INSERT INTO activityLog
      (userId, type, category, description, metadataJson, ip, userAgent, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId ?? null,
    type,
    category,
    description,
    metadataJson,
    ip ?? null,
    userAgent ?? null,
    now
  );
}

export function listActivityForUser(params: {
  userId: number;
  limit?: number;
  offset?: number;
  type?: string | null;
  category?: string | null;
}): ActivityLogRow[] {
  const { userId, limit = 100, offset = 0, type, category } = params;

  const whereParts = ["(userId = ? OR userId IS NULL)"];
  const args: any[] = [userId];

  if (type) {
    whereParts.push("type = ?");
    args.push(type);
  }

  if (category) {
    whereParts.push("category = ?");
    args.push(category);
  }

  args.push(limit);
  args.push(offset);

  const rows = db
    .prepare(
      `SELECT id, userId, type, category, description, metadataJson, ip, userAgent, createdAt
       FROM activityLog
       WHERE ${whereParts.join(" AND ")}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .all(...args) as ActivityLogRow[];

  return rows;
}
