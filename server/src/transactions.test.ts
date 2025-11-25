/// <reference types="vitest" />

import { describe, it, expect, vi } from "vitest";

// Mock del database SQLite usato da transactions.ts
vi.mock("./db", () => {
  return {
    db: {
      prepare(sql: string) {
        return {
          all(userId: number, ..._rest: any[]) {
            if (sql.includes("FROM deposits")) {
              return [
                {
                  id: 1,
                  asset: "BTC",
                  amount: 0.5,
                  gateway: "TestGateway",
                  status: "completed",
                  createdAt: "2024-01-02T00:00:00.000Z",
                },
              ];
            }

            if (sql.includes("FROM withdrawals")) {
              return [
                {
                  id: 2,
                  asset: "USDT",
                  amount: 100,
                  address: "0xwithdraw",
                  status: "pending",
                  createdAt: "2024-01-01T00:00:00.000Z",
                },
              ];
            }

            if (sql.includes("FROM internalTransfers")) {
              return [
                {
                  id: 3,
                  fromUserId: userId,
                  toUserId: 99,
                  asset: "ETH",
                  amount: 1.23,
                  createdAt: "2024-01-03T00:00:00.000Z",
                },
              ];
            }

            return [];
          },
        };
      },
    },
  };
});

describe("listTransactionsForUser", () => {
  it("merges deposits, withdrawals and internal transfers and sorts by createdAt desc", async () => {
    const { listTransactionsForUser } = await import("./transactions");

    const result = listTransactionsForUser(1, 10);

    expect(result.length).toBe(3);

    // Ordinati per data discendente: 3 (internal), 1 (deposit), 2 (withdrawal)
    expect(result[0].id).toBe("internal:3");
    expect(result[0].type).toBe("internal_sent");
    expect(result[0].direction).toBe("out");
    expect(result[0].asset).toBe("ETH");

    expect(result[1].id).toBe("deposit:1");
    expect(result[1].type).toBe("deposit");
    expect(result[1].direction).toBe("in");
    expect(result[1].asset).toBe("BTC");

    expect(result[2].id).toBe("withdrawal:2");
    expect(result[2].type).toBe("withdrawal");
    expect(result[2].direction).toBe("out");
    expect(result[2].asset).toBe("USDT");
  });
});
