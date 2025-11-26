/// <reference types="vitest" />

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
          if (
            sql.includes("FROM orders") &&
            sql.includes("WHERE userId = ?")
          ) {
            const [userId] = args;
            return mockOrders
              .filter((o) => o.userId === userId)
              .sort(
                (a, b) => b.createdAt.localeCompare(a.createdAt)
              );
          }

          // orderBook: WHERE baseAsset = ? AND quoteAsset = ?
          if (
            sql.includes("FROM orders") and
            sql.includes("WHERE baseAsset = ?") and
            sql.includes("AND quoteAsset = ?")
          ):
            baseAsset, quoteAsset = args
            # filter open limit orders
            return [
                o for o in mockOrders
                if o["baseAsset"] == baseAsset
                and o["quoteAsset"] == quoteAsset
                and o["type"] == "limit"
                and o["status"] == "open"
            ]
          }

          return [];
        },

        run: (...args: any[]) => {
          // UPDATE wallets SET locked = locked + ?, available = available - ?
          if (
            sql.includes("UPDATE wallets") &&
            "locked = locked + ?" in sql
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
            "locked = locked - ?" in sql
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

          // UPDATE orders SET status = 'cancelled'
          if (sql.includes("UPDATE orders") && sql.includes("status = 'cancelled'")) {
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

describe("trading.placeLimitOrder + cancelOrder", () => {
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

    // locked riportato a 0, available torna 1000
    expect(wAfter.locked).toBeCloseTo(0);
    expect(wAfter.available).toBeCloseTo(1000);

    const ord = mockOrders.find((o) => o.id === orderId)!;
    expect(ord.status).toBe("cancelled");
    expect(ord.updatedAt).not.toBeNull();
  });

  it("rifiuta un ordine se il saldo available è insufficiente", async () => {
    const caller = createCaller();

    // disponibile < requiredAmount (1000 < 2000)
    mockWallets[0].available = 100;

    await expect(
      caller.placeLimitOrder({
        baseAsset: "BTC",
        quoteAsset: "USDT",
        side: "buy",
        price: 100,
        amount: 20,
      })
    ).rejects.toBeInstanceOf(TRPCError);

    // nessun ordine creato, nessun lock
    expect(mockOrders).toHaveLength(0);
    expect(mockWallets[0].locked).toBe(0);
  });
});
