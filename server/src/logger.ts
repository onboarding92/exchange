import { db } from "./db";

export type LogLevel = "info" | "warn" | "error" | "security";

export type LogRecord = {
  id: number;
  level: LogLevel | string;
  message: string;
  contextJson: string | null;
  createdAt: string;
};

db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    contextJson TEXT,
    createdAt TEXT NOT NULL
  )
`).run();

function writeLog(level: LogLevel, message: string, context?: any) {
  const now = new Date().toISOString();
  const ctx = context ? JSON.stringify(context) : null;

  db.prepare(
    `INSERT INTO logs (level, message, contextJson, createdAt)
     VALUES (?,?,?,?)`
  ).run(level, message, ctx, now);
}

export function logInfo(message: string, context?: any) {
  writeLog("info", message, context);
}

export function logWarn(message: string, context?: any) {
  writeLog("warn", message, context);
}

export function logError(message: string, context?: any) {
  writeLog("error", message, context);
}

export function logSecurity(message: string, context?: any) {
  writeLog("security", message, context);
}

/**
 * Admin: fetch recent logs with optional filtering.
 */
export function getRecentLogs(options?: {
  level?: LogLevel;
  search?: string;
  limit?: number;
}): LogRecord[] {
  const level = options?.level;
  const search = options?.search?.trim();
  const limit = options?.limit ?? 100;

  const where: string[] = [];
  const params: any[] = [];

  if (level) {
    where.push("level = ?");
    params.push(level);
  }

  if (search && search.length > 0) {
    where.push("(message LIKE ? OR contextJson LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }

  let sql = `
    SELECT id, level, message, contextJson, createdAt
    FROM logs
  `;

  if (where.length > 0) {
    sql += " WHERE " + where.join(" AND ");
  }

  sql += " ORDER BY createdAt DESC LIMIT ?";

  params.push(limit);

  return db.prepare(sql).all(...params) as LogRecord[];
}
