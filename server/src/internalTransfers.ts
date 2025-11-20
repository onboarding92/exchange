import { db } from "./db";

export type InternalTransferRow = {
  id: number;
  fromUserId: number;
  toUserId: number;
  asset: string;
  amount: number;
  memo: string | null;
  createdAt: string;
};

function ensureInternalTransfersTable() {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='internalTransfers'"
    )
    .all() as { name: string }[];

  if (!rows || rows.length === 0) {
    db.prepare(
      `CREATE TABLE internalTransfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromUserId INTEGER NOT NULL,
        toUserId INTEGER NOT NULL,
        asset TEXT NOT NULL,
        amount REAL NOT NULL,
        memo TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(fromUserId) REFERENCES users(id),
        FOREIGN KEY(toUserId) REFERENCES users(id)
      )`
    ).run();
    console.log("[internalTransfers] Created internalTransfers table");
  }
}

// Run once on import
ensureInternalTransfersTable();

/**
 * List internal transfers involving a given user (sent or received).
 */
export function listInternalTransfersForUser(userId: number): InternalTransferRow[] {
  const sql = `
    SELECT id, fromUserId, toUserId, asset, amount, memo, createdAt
    FROM internalTransfers
    WHERE fromUserId = ? OR toUserId = ?
    ORDER BY createdAt DESC
    LIMIT 500
  `;
  const rows = db.prepare(sql).all(userId, userId) as InternalTransferRow[];
  return rows;
}
