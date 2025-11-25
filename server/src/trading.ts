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
 * Questa funzione viene eseguita al momento dell'import del modulo.
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
