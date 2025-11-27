import Database from "better-sqlite3";

// Percorso DB
const db = new Database("./exchange.db");

// Ricrea la tabella userKycDocuments
db.prepare("DROP TABLE IF EXISTS userKycDocuments").run();

db.prepare(`
CREATE TABLE IF NOT EXISTS userKycDocuments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  frontUrl TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL,
  reviewNote TEXT,
  reviewedAt TEXT,
  reviewedBy INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
)
`).run();

console.log("✔ userKycDocuments recreated successfully.");
