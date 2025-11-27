import Database from "better-sqlite3";

export const db = new Database("bitchange.db");

db.pragma("journal_mode = WAL");

// ---- TABLES ----
db.exec(`
CREATE TABLE IF NOT EXISTS users (
db.prepare(`
  CREATE TABLE IF NOT EXISTS emailVerifications (
db.prepare(`
  CREATE TABLE IF NOT EXISTS passwordResets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
  )
`).run();
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    code TEXT NOT NULL,
    expiresAt INTEGER NOT NULL
  )
`).run();
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  kycStatus TEXT NOT NULL DEFAULT 'unverified',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS userKycDocuments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  frontUrl TEXT,
  backUrl TEXT,
  selfieUrl TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  reviewedAt TEXT,
  reviewNote TEXT,
  reviewedBy INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
`);

export function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (row.c > 0) return;

  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (email,passwordHash,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
  ).run("demo@bitchange.money", "demo-hash", "user", "unverified", now, now);

  db.prepare(
    "INSERT INTO users (email,passwordHash,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
  ).run("admin@bitchange.money", "admin-hash", "admin", "verified", now, now);
}

seedIfEmpty();
