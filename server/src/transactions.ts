import { db } from "./db";

export type UnifiedTransaction = {
  id: string; // e.g. "deposit:123"
  type: "deposit" | "withdrawal" | "internal_sent" | "internal_received";
  asset: string;
  amount: number;
  direction: "in" | "out";
  status?: string;
  createdAt: string;
  description: string;
};

export function listTransactionsForUser(userId: number, limit = 200): UnifiedTransaction[] {
  const txs: UnifiedTransaction[] = [];

  // Deposits
  const depositRows = db
    .prepare(
      `SELECT id, asset, amount, status, createdAt, gateway, provider
       FROM deposits
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .all(userId, limit) as any[];

  for (const d of depositRows) {
    txs.push({
      id: `deposit:${d.id}`,
      type: "deposit",
      asset: d.asset,
      amount: d.amount,
      direction: "in",
      status: d.status,
      createdAt: d.createdAt ?? new Date().toISOString(),
      description: `Deposit via ${d.provider || d.gateway || "manual"}`,
    });
  }

  // Withdrawals
  try {
    const withdrawalRows = db
      .prepare(
        `SELECT id, asset, amount, status, createdAt, address
         FROM withdrawals
         WHERE userId = ?
         ORDER BY createdAt DESC
         LIMIT ?`
      )
      .all(userId, limit) as any[];

    for (const w of withdrawalRows) {
      txs.push({
        id: `withdrawal:${w.id}`,
        type: "withdrawal",
        asset: w.asset,
        amount: w.amount,
        direction: "out",
        status: w.status,
        createdAt: w.createdAt ?? new Date().toISOString(),
        description: `Withdrawal to ${w.address ?? "external address"}`,
      });
    }
  } catch (e) {
    // If withdrawals table/columns differ or dont exist, we simply skip them.
    // This keeps the history page robust even if schema changes.
    console.warn("[transactions] Skipping withdrawals in history:", e);
  }

  // Internal transfers
  try {
    const internalRows = db
      .prepare(
        `SELECT id, fromUserId, toUserId, asset, amount, memo, createdAt
         FROM internalTransfers
         WHERE fromUserId = ? OR toUserId = ?
         ORDER BY createdAt DESC
         LIMIT ?`
      )
      .all(userId, userId, limit) as any[];

    for (const t of internalRows) {
      const base: Omit<UnifiedTransaction, "id" | "type" | "direction"> = {
        asset: t.asset,
        amount: t.amount,
        status: "completed",
        createdAt: t.createdAt ?? new Date().toISOString(),
        description: t.memo
          ? `Internal transfer (${t.memo})`
          : "Internal transfer",
      };

      if (t.fromUserId === userId) {
        txs.push({
          id: `internal_sent:${t.id}`,
          type: "internal_sent",
          direction: "out",
          ...base,
        });
      } else if (t.toUserId === userId) {
        txs.push({
          id: `internal_received:${t.id}`,
          type: "internal_received",
          direction: "in",
          ...base,
        });
      }
    }
  } catch (e) {
    console.warn("[transactions] Skipping internalTransfers in history:", e);
  }

  // Sort all combined by date desc and limit
  txs.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return txs.slice(0, limit);
}
