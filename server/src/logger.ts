import { db } from "./db";

export type LogLevel = "info" | "warn" | "error" | "security";

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
