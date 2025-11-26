import { db } from "./db";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";

export type OrderRow = {
  id: number;
  userId: number;
  baseAsset: string;
  quoteAsset: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: number | null;
  amount: number;
  filledAmount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type TradeRow = {
  id: number;
  buyOrderId: number;
  sellOrderId: number;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  amount: number;
  takerUserId: number;
  makerUserId: number;
  createdAt: string;
};

/**
 * Crea le tabelle base per il trading (ordini + trade eseguiti).
 */
export function ensureTradingSchema() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      baseAsset TEXT NOT NULL,
      quoteAsset TEXT NOT NULL,
      side TEXT NOT NULL,      -- "buy" | "sell"
      type TEXT NOT NULL,      -- "market" | "limit"
      status TEXT NOT NULL,    -- "open" | "partially_filled" | "filled" | "cancelled"
      price REAL,              -- null per market order
      amount REAL NOT NULL,
      filledAmount REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyOrderId INTEGER NOT NULL,
      sellOrderId INTEGER NOT NULL,
      baseAsset TEXT NOT NULL,
      quoteAsset TEXT NOT NULL,
      price REAL NOT NULL,
      amount REAL NOT NULL,
      takerUserId INTEGER NOT NULL,
      makerUserId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    )
  `
  ).run();
}

// Inizializza lo schema trading all'import del modulo.
ensureTradingSchema();

/**
 * Matching engine minimale:
 * - funziona solo per ordini LIMIT già inseriti
 * - non tocca ancora i wallet (solo ordini + trades)
 */
export function matchOrder(orderId: number) {
  const order = db
    .prepare(
      `
      SELECT id, userId, baseAsset, quoteAsset, side, type, status,
             price, amount, filledAmount, createdAt, updatedAt
      FROM orders
      WHERE id = ?
    `
    )
    .get(orderId) as OrderRow | undefined;

  if (!order) return;
  if (order.status !== "open") return;
  if (order.type !== "limit") return;
  if (order.price == null) return;

  let remaining = Math.max(0, order.amount - (order.filledAmount ?? 0));
  if (remaining <= 0) return;

  const isBuy = order.side === "buy";
  const base = order.baseAsset;
  const quote = order.quoteAsset;

  const op = isBuy ? "<=" : ">=";
  const priceOrder = isBuy ? "ASC" : "DESC";
  const oppositeSide = isBuy ? "sell" : "buy";

  const matches = db
    .prepare(
      `
      SELECT id, userId, baseAsset, quoteAsset, side, type, status,
             price, amount, filledAmount, createdAt, updatedAt
      FROM orders
      WHERE baseAsset = ?
        AND quoteAsset = ?
        AND type = 'limit'
        AND status = 'open'
        AND side = ?
        AND price ${op} ?
        AND id != ?
      ORDER BY price ${priceOrder}, createdAt ASC
    `
    )
    .all(base, quote, oppositeSide, order.price, order.id) as OrderRow[];

  if (!matches.length) return;

  let orderFilled = order.filledAmount ?? 0;
  const nowIso = new Date().toISOString();

  for (const other of matches) {
    if (remaining <= 0) break;

    const otherFilled = other.filledAmount ?? 0;
    let otherRemaining = Math.max(0, other.amount - otherFilled);
    if (otherRemaining <= 0) continue;

    const tradeAmount = Math.min(remaining, otherRemaining);
    if (tradeAmount <= 0) continue;

    const tradePrice = other.price ?? order.price;

    const buyOrderId = isBuy ? order.id : other.id;
    const sellOrderId = isBuy ? other.id : order.id;
    const takerUserId = order.userId;
    const makerUserId = other.userId;

    db.prepare(
      `
      INSERT INTO trades (
        buyOrderId, sellOrderId,
        baseAsset, quoteAsset,
        price, amount,
        takerUserId, makerUserId,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      buyOrderId,
      sellOrderId,
      base,
      quote,
      tradePrice,
      tradeAmount,
      takerUserId,
      makerUserId,
      nowIso
    );

    // aggiorna filled dell'ordine principale
    orderFilled += tradeAmount;
    remaining = Math.max(0, order.amount - orderFilled);

    db.prepare(
      `
      UPDATE orders
      SET filledAmount = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `
    ).run(
      orderFilled,
      orderFilled >= order.amount ? "filled" : "partially_filled",
      nowIso,
      order.id
    );

    // aggiorna filled dell'ordine opposto
    const newOtherFilled = otherFilled + tradeAmount;
    db.prepare(
      `
      UPDATE orders
      SET filledAmount = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `
    ).run(
      newOtherFilled,
      newOtherFilled >= other.amount ? "filled" : "partially_filled",
      nowIso,
      other.id
    );
  }
}
