/// <reference types='vitest' />

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { tradingRouter } from "./routers.trading";

// Stato shared mock
type WalletRow = {
  userId: number;
  asset: string;
  balance: number;
  locked: number;
  available: number;
};

type OrderRow = {
  id: number;
  userId: number;
  baseAsset: string;
  quoteAsset: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  status: string;
  price: number | null;
  amount: number;
  filledAmount: number;
  createdAt: string;
  updatedAt: string | null;
};

let mockWallets: WalletRow[] = [];
let mockOrders: OrderRow[] = [];
let mockTrades: { buyOrderId: number; sellOrderId: number; price: number; amount: number }[] = [];
let nextOrderId = 1;

// Mock del modulo db usato da tradingRouter
vi.mock("./db", () => {
  const db = {
    prepare(sql: string) {
      return {
        get: (...args: any[]) => {
          // SELECT wallet
          if (sql.includes("FROM wallets")) {
            const [userId, asset] = args;
            return mockWallets.find(
              (w) => w.userId === userId && w.asset === asset
            );
          }

          // SELECT order by id
          if (sql.includes("FROM orders") && sql.includes("WHERE id = ?")) {
            const [id] = args;
            return mockOrders.find((o) => o.id === id);
          }

          return undefined;
        },

        all: (...args: any[]) => {
          // myOrders: WHERE userId = ?
          if (sql.includes("FROM orders") && sql.includes("WHERE userId = ?")) {
            const [userId] = args;
            return mockOrders
              .filter((o) => o.userId === userId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          }

          // orderBook: WHERE baseAsset = ? AND quoteAsset = ?
          if (
            sql.includes("FROM orders") &&
            sql.includes("WHERE baseAsset = ?") &&
            sql.includes("AND quoteAsset = ?")
          ) {
            const [baseAsset, quoteAsset] = args;
            return mockOrders.filter(
              (o) =>
                o.baseAsset === baseAsset &&
                o.quoteAsset === quoteAsset &&
                o.type === "limit" &&
                o.status === "open"
            );
          }

          return [];
        },

        run: (...args: any[]) => {
          // UPDATE wallets SET locked = locked + ?, available = available - ?
          if (
            sql.includes("UPDATE wallets") &&
            sql.includes("locked = locked + ?") &&
            sql.includes("available = available - ?")
          ) {
            const [delta, _deltaAvail, userId, asset] = args;
            const w = mockWallets.find(
              (w) => w.userId === userId && w.asset === asset
            );
            if (!w) throw new Error("Wallet not found in mock (lock).");
            w.locked += delta;
            w.available -= delta;
            return { changes: 1 };
          }

          // UPDATE wallets SET locked = locked - ?, available = available + ?
          if (
            sql.includes("UPDATE wallets") &&
            sql.includes("locked = locked - ?") &&
            sql.includes("available = available + ?")
          ) {
            const [delta, _deltaAvail, userId, asset] = args;
            const w = mockWallets.find(
              (w) => w.userId === userId && w.asset === asset
            );
            if (!w) throw new Error("Wallet not found in mock (unlock).");
            w.locked -= delta;
            w.available += delta;
            return { changes: 1 };
          }

          // INSERT INTO orders
          if (sql.includes("INSERT INTO orders")) {
            const [
              userId,
              baseAsset,
              quoteAsset,
              side,
              price,
              amount,
              createdAt,
            ] = args;

            const order: OrderRow = {
              id: nextOrderId++,
              userId,
              baseAsset,
              quoteAsset,
              side,
              type: "limit",
              status: "open",
              price,
              amount,
              filledAmount: 0,
              createdAt,
              updatedAt: null,
            };
            mockOrders.push(order);
            return { changes: 1, lastInsertRowid: order.id };
          }

          // INSERT INTO trades
          if (sql.includes("INSERT INTO trades")) {
            const [
              buyOrderId,
              sellOrderId,
              _baseAsset,
              _quoteAsset,
              price,
              amount,
              _takerUserId,
              _makerUserId,
              _createdAt,
            ] = args;
            mockTrades.push({ buyOrderId, sellOrderId, price, amount });
            return { changes: 1, lastInsertRowid: mockTrades.length };
          }

          // UPDATE orders SET status = 'cancelled'
          if (
            sql.includes("UPDATE orders") &&
            sql.includes("status = 'cancelled'")
          ) {
            const [updatedAt, id] = args;
            const o = mockOrders.find((o) => o.id === id);
            if (o) {
              o.status = "cancelled";
              o.updatedAt = updatedAt;
              return { changes: 1 };
            }
            return { changes: 0 };
          }

          return { changes: 1 };
        },
      };
    },
  };

  return { db };
});

// Helper per creare il caller tRPC autenticato
function createCaller(userId = 1) {
  const ctx = {
    user: {
      id: userId,
      email: "test@example.com",
      role: "user" as const,
    },
    req: {
      headers: {
        "user-agent": "Vitest",
      },
    },
    res: {} as any,
  } as any;

  return tradingRouter.createCaller(ctx);
}

describe("trading.placeLimitOrder + cancelOrder (locked/available)", () => {
  beforeEach(() => {
    mockWallets = [
      {
        userId: 1,
        asset: "USDT",
        balance: 1000,
        locked: 0,
        available: 1000,
      },
    ];
    mockOrders = [];
    mockTrades = [];
    nextOrderId = 1;
  });

  it("blocca i fondi corretti per un BUY limit order", async () => {
    const caller = createCaller();

    await caller.placeLimitOrder({
      baseAsset: "BTC",
      quoteAsset: "USDT",
      side: "buy",
      price: 10, // USDT
      amount: 5, // BTC
    });

    const w = mockWallets[0];
    // requiredAmount = amount * price = 50
    expect(w.locked).toBeCloseTo(50);
    expect(w.available).toBeCloseTo(950);
    expect(mockOrders).toHaveLength(1);
    expect(mockOrders[0].status).toBe("open");
  });

  it("sblocca i fondi quando l'ordine viene cancellato", async () => {
    const caller = createCaller();

    await caller.placeLimitOrder({
      baseAsset: "BTC",
      quoteAsset: "USDT",
      side: "buy",
      price: 10,
      amount: 5,
    });

    const orderId = mockOrders[0].id;

    const wBefore = { ...mockWallets[0] };
    expect(wBefore.locked).toBeCloseTo(50);

    await caller.cancelOrder({ id: orderId });

    const wAfter = mockWallets[0];

    expect(wAfter.locked).toBeCloseTo(0);
    expect(wAfter.available).toBeCloseTo(1000);

    const ord = mockOrders.find((o) => o.id === orderId)!;
    expect(ord.status).toBe("cancelled");
    expect(ord.updatedAt).not.toBeNull();
  });

  it("rifiuta un ordine se il saldo available è insufficiente", async () => {
    const caller = createCaller();

    // disponibile < requiredAmount (100 < 200)
    mockWallets[0].available = 100;

    await expect(
      caller.placeLimitOrder({
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "buy",
        price: 10,
        amount: 20,
      })
    ).rejects.toBeInstanceOf(TRPCError);

    expect(mockOrders).toHaveLength(0);
    expect(mockWallets[0].locked).toBe(0);
  });

  it("costruisce un orderBook aggregando gli ordini open per prezzo", async () => {
    const caller = createCaller();

    const now = new Date().toISOString();

    mockOrders.push(
      {
        id: nextOrderId++,
        userId: 1,
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "buy",
        type: "limit",
        status: "open",
        price: 100,
        amount: 1,
        filledAmount: 0,
        createdAt: now,
        updatedAt: null,
      },
      {
        id: nextOrderId++,
        userId: 1,
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "buy",
        type: "limit",
        status: "open",
        price: 99,
        amount: 2,
        filledAmount: 0,
        createdAt: now,
        updatedAt: null,
      },
      {
        id: nextOrderId++,
        userId: 2,
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "sell",
        type: "limit",
        status: "open",
        price: 105,
        amount: 0.5,
        filledAmount: 0,
        createdAt: now,
        updatedAt: null,
      },
      {
        id: nextOrderId++,
        userId: 3,
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "sell",
        type: "limit",
        status: "open",
        price: 105,
        amount: 0.25,
        filledAmount: 0,
        createdAt: now,
        updatedAt: null,
      }
    );

    const book = await caller.orderBook({
      baseAsset: "BTC",
      quoteAsset: "USDT",
    });

    expect(book.baseAsset).toBe("BTC");
    expect(book.quoteAsset).toBe("USDT");

    // BID: due livelli a 100 e 99, ordinati per prezzo desc
    expect(book.bids).toHaveLength(2);
    expect(book.bids[0].price).toBe(100);
    expect(book.bids[0].amount).toBeCloseTo(1);
    expect(book.bids[1].price).toBe(99);
    expect(book.bids[1].amount).toBeCloseTo(2);

    // ASK: un solo livello a 105, con amount aggregato = 0.5 + 0.25 = 0.75
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0].price).toBe(105);
    expect(book.asks[0].amount).toBeCloseTo(0.75);
  });


  it("esegue matching base tra un BUY e un SELL limit order", async () => {
    const caller = createCaller();

    const now = new Date().toISOString();

    // Ordine SELL preesistente sul book: 1 BTC @ 100 USDT
    mockOrders.push({
      id: nextOrderId++,
      userId: 2,
      baseAsset: "BTC",
      quoteAsset: "USDT",
      side: "sell",
      type: "limit",
      status: "open",
      price: 100,
      amount: 1,
      filledAmount: 0,
      createdAt: now,
      updatedAt: null,
    });

    // L'utente 1 piazza un BUY 0.5 BTC @ 105 → dovrebbe matchare il SELL 100
    await caller.placeLimitOrder({
      baseAsset: "BTC",
      quoteAsset: "USDT",
      side: "buy",
      price: 105,
      amount: 0.5,
    });

    // Dovrebbe essere stato creato un trade
    expect(mockTrades.length).toBe(1);
    const trade = mockTrades[0];
    expect(trade.price).toBe(100);
    expect(trade.amount).toBeCloseTo(0.5);

    // Trova ordini aggiornati
    const buyOrder = mockOrders.find((o) => o.userId === 1)!;
    const sellOrder = mockOrders.find((o) => o.userId === 2)!;

    // Gli ordini esistono e il trade è stato creato.
    // (Nel mock non aggiorniamo filledAmount/status sugli ordini.)
    expect(buyOrder).toBeDefined();
    expect(sellOrder).toBeDefined();
  });

});
