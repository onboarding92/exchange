import Database from "better-sqlite3";
export const db = new Database("exchange.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

//
// ========== USERS =========
//
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  kycStatus TEXT NOT NULL DEFAULT 'unverified',
  forcePasswordChange INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
)
`).run();

//
// ========== SESSIONS =========
//
db.prepare(`
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

//
// ========== EMAIL VERIFICATIONS =========
//
db.prepare(`
CREATE TABLE IF NOT EXISTS emailVerifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

//
// ========== PASSWORD RESET TOKENS =========
//
db.prepare(`
CREATE TABLE IF NOT EXISTS passwordResets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expiresAt TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

//
// ========== KYC DOCUMENTS =========
//
db.prepare(`
CREATE TABLE IF NOT EXISTS userKycDocuments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  frontUrl TEXT,
  backUrl TEXT,
  selfieUrl TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL,
  updatedAt TEXT,
  note TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

export function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c > 0) return;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (email, passwordHash, role, kycStatus, createdAt)
    VALUES ('demo@bitchange.money', '$2a$10$demo', 'user', 'unverified', ?)
  `).run(now);

  db.prepare(`
    INSERT INTO users (email, passwordHash, role, kycStatus, createdAt)
    VALUES ('admin@bitchange.money', '$2a$10$admin', 'admin', 'unverified', ?)
  `).run(now);
}

seedIfEmpty();


CREATE TABLE IF NOT EXISTS passwordHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);
