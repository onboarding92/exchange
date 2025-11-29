import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

export const db = new Database("exchange.db");

// Basic pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ========== USERS TABLE ==========
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    kycStatus TEXT NOT NULL DEFAULT 'unverified',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`).run();

// ========== SESSIONS TABLE ==========
db.prepare(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    userAgent TEXT,
    ip TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

/**
 * Seed initial demo/admin users if the table is empty.
 * This is required by the test suite.
 */
export function seedIfEmpty() {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM users")
    .get() as { c: number };

  if (row.c > 0) return;

  const now = new Date().toISOString();

  const demoPassword = process.env.DEMO_PASSWORD || "demo123";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const demoHash = bcrypt.hashSync(demoPassword, 10);
  const adminHash = bcrypt.hashSync(adminPassword, 10);

  const insertUser = db.prepare(
    "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
  );

  insertUser.run(
    "demo@bitchange.money",
    demoHash,
    "user",
    "verified",
    now,
    now
  );
  insertUser.run(
    "admin@bitchange.money",
    adminHash,
    "admin",
    "verified",
    now,
    now
  );
}

// Run seeding on module load
seedIfEmpty();

// ========= ACTIVITY LOGS =========
db.prepare(`
CREATE TABLE IF NOT EXISTS activityLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  action TEXT NOT NULL,
  ip TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

