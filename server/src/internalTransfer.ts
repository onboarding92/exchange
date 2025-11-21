import { db } from "./db";

export type InternalTransfer = {
  id: number;
  fromUserId: number;
  toUserId: number;
  asset: string;
  amount: number;
  createdAt: string;
  note: string | null;
  status: string; // "completed" (placeholder for future states)
};

function ensureInternalTransferSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS internalTransfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromUserId INTEGER NOT NULL,
      toUserId INTEGER NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(fromUserId) REFERENCES users(id),
      FOREIGN KEY(toUserId) REFERENCES users(id)
    )`
  ).run();
}

ensureInternalTransferSchema();

export function listTransfersForUser(userId: number, limit = 100): InternalTransfer[] {
  const rows = db
    .prepare(
      `SELECT id, fromUserId, toUserId, asset, amount, note, status, createdAt
       FROM internalTransfers
       WHERE fromUserId = ? OR toUserId = ?
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .all(userId, userId, limit) as InternalTransfer[];

  return rows;
}
