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

/**
 * Restituisce una lista unificata di transazioni per un utente:
 * - deposits
 * - withdrawals
 * - internal transfers (sent/received)
 *
 * I dati vengono letti dalle tabelle SQLite:
 *  - deposits(userId, asset, amount, gateway, status, createdAt, ...)
 *  - withdrawals(userId, asset, amount, address, status, createdAt, ...)
 *  - internalTransfers(fromUserId, toUserId, asset, amount, createdAt, ...)
 *
 * Ogni sezione è in try/catch per rendere la history robusta
 * anche se qualche tabella/colonna cambia.
 */
export function listTransactionsForUser(
  userId: number,
  limit = 200
): UnifiedTransaction[] {
  const txs: UnifiedTransaction[] = [];

  // ==========================
  // Deposits
  // ==========================
  try {
    const rows = db
      .prepare(
        `
        SELECT id, asset, amount, gateway, status, createdAt
        FROM deposits
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
      )
      .all(userId, limit) as {
      id: number;
      asset: string;
      amount: number;
      gateway?: string | null;
      status?: string;
      createdAt: string;
    }[];

    for (const d of rows) {
      txs.push({
        id: `deposit:${d.id}`,
        type: "deposit",
        asset: d.asset,
        amount: d.amount,
        direction: "in",
        status: d.status,
        createdAt: d.createdAt,
        description: d.gateway
          ? `Deposit via ${d.gateway}`
          : "Deposit",
      });
    }
  } catch (e) {
    console.warn("[transactions] Skipping deposits in history:", e);
  }

  // ==========================
  // Withdrawals
  // ==========================
  try {
    const rows = db
      .prepare(
        `
        SELECT id, asset, amount, address, status, createdAt
        FROM withdrawals
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
      )
      .all(userId, limit) as {
      id: number;
      asset: string;
      amount: number;
      address?: string | null;
      status?: string;
      createdAt: string;
    }[];

    for (const w of rows) {
      txs.push({
        id: `withdrawal:${w.id}`,
        type: "withdrawal",
        asset: w.asset,
        amount: w.amount,
        direction: "out",
        status: w.status,
        createdAt: w.createdAt,
        description: `Withdrawal to ${
          w.address ?? "external address"
        }`,
      });
    }
  } catch (e) {
    console.warn("[transactions] Skipping withdrawals in history:", e);
  }

  // ==========================
  // Internal transfers
  // ==========================
  try {
    const rows = db
      .prepare(
        `
        SELECT id, fromUserId, toUserId, asset, amount, createdAt
        FROM internalTransfers
        WHERE fromUserId = ? OR toUserId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
      )
      .all(userId, userId, limit) as {
      id: number;
      fromUserId: number;
      toUserId: number;
      asset: string;
      amount: number;
      createdAt: string;
    }[];

    for (const t of rows) {
      const isSender = t.fromUserId === userId;

      txs.push({
        id: `internal:${t.id}`,
        type: isSender ? "internal_sent" : "internal_received",
        asset: t.asset,
        amount: t.amount,
        direction: isSender ? "out" : "in",
        createdAt: t.createdAt,
        description: isSender
          ? `Internal transfer to user #${t.toUserId}`
          : `Internal transfer from user #${t.fromUserId}`,
      });
    }
  } catch (e) {
    console.warn(
      "[transactions] Skipping internalTransfers in history:",
      e
    );
  }

  // ==========================
  // Sort globale + limit
  // ==========================
  txs.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return txs.slice(0, limit);
}
