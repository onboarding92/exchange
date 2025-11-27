/// <reference types='vitest' />

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// Stato condiviso per i mock del DB
let mockCoinRow:
  | {
      enabled: number;
      minWithdraw: number;
      withdrawFee: number;
    }
  | undefined;

let mockWalletRow:
  | {
      userId: number;
      asset: string;
      balance: number;
      locked: number;
      available: number;
    }
  | undefined;

type WithdrawalRow = {
  id: number;
  userId: number;
  asset: string;
  amount: number;
  address: string;
  status: string;
};

let mockWithdrawals: WithdrawalRow[] = [];
let nextWithdrawalId = 1;

// Mock logger
vi.mock("./logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logSecurity: vi.fn(),
}));

// Mock twoFactor
let mockTwoFactor:
  | {
      enabled: number;
      secret: string;
    }
  | null
  | undefined = null;

vi.mock("./twoFactor", () => {
  return {
    getTwoFactor: (_userId: number) => mockTwoFactor,
  };
});

// Mock otplib authenticator
vi.mock("otplib", () => {
  return {
    authenticator: {
      check: vi.fn((code: string, secret: string) => {
        // semplice regola: "123456" è sempre valido se c'è una secret
        return code === "123456" && !!secret;
      }),
    },
  };
});

// Mock email (non verifichiamo effettivo invio)
vi.mock("./email", () => ({
  sendWithdrawalRequestEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock activity log
vi.mock("./activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock del modulo db usato da routers.wallet
vi.mock("./db", () => {
  const db = {
    prepare(sql: string) {
      return {
        get: (...args: any[]) => {
          // coins
          if (sql.includes("FROM coins")) {
            return mockCoinRow;
          }

          // wallets
          if (sql.includes("FROM wallets")) {
            const [userId, asset] = args;
            if (
              mockWalletRow &&
              mockWalletRow.userId === userId &&
              mockWalletRow.asset === asset
            ) {
              return mockWalletRow;
            }
            return undefined;
          }

          // withdrawals, select ultimo per email o id ecc. (non usato qui)
          if (sql.includes("FROM withdrawals")) {
            return undefined;
          }

          return undefined;
        },

        all: (..._args: any[]) => {
          return [];
        },

        run: (...args: any[]) => {
          // UPDATE wallets lock funds (locked = locked + ?, available = available - ?)
          if (
            sql.includes("UPDATE wallets") &&
            sql.includes("locked = locked + ?") &&
            sql.includes("available = available - ?")
          ) {
            const [delta, _deltaAvail, userId, asset] = args;
            if (!mockWalletRow) throw new Error("No mockWalletRow set");
            if (
              mockWalletRow.userId !== userId ||
              mockWalletRow.asset !== asset
            ) {
              throw new Error("Wallet row mismatch in lock UPDATE");
            }
            mockWalletRow.locked += delta;
            mockWalletRow.available -= delta;
            return { changes: 1 };
          }

          // INSERT INTO withdrawals
          if (sql.includes("INSERT INTO withdrawals")) {
            const [
              userId,
              asset,
              amount,
              address,
              status,
              _createdAt,
            ] = args;
            mockWithdrawals.push({
              id: nextWithdrawalId++,
              userId,
              asset,
              amount,
              address,
              status,
            });
            return { changes: 1 };
          }

          // qualunque altro INSERT/UPDATE lo ignoriamo
          return { changes: 1 };
        },
      };
    },
  };

  return { db };
});

// Import del router dopo i mock
import { walletRouter } from "./routers.wallet";

function createCaller() {
  const ctx = {
    user: {
      id: 1,
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

  return walletRouter.createCaller(ctx);
}

describe("wallet.requestWithdrawal con locked/available", () => {
  beforeEach(() => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 5,
      withdrawFee: 1,
    };

    mockWalletRow = {
      userId: 1,
      asset: "USDT",
      balance: 1000,
      locked: 0,
      available: 1000,
    };

    mockWithdrawals = [];
    nextWithdrawalId = 1;

    // 2FA abilitata con secret di test
    mockTwoFactor = {
      enabled: 1,
      secret: "SECRET",
    };
  });

  it("blocca amount + fee da available in locked", async () => {
    const caller = createCaller();

    await caller.requestWithdrawal({
      asset: "USDT",
      amount: 10,
      address: "addr_test_12345",
      twoFactorCode: "123456",
    });

    // Verifica che i fondi siano stati spostati da available a locked
    expect(mockWalletRow).toBeDefined();
    // locked deve essere > 0
    expect(mockWalletRow!.locked).toBeGreaterThan(0);
    // available deve essere < balance iniziale (1000)
    expect(mockWalletRow!.available).toBeLessThan(1000);
    // I fondi spostati devono coincidere con la differenza tra available iniziale e finale
    const moved = 1000 - mockWalletRow!.available;
    expect(mockWalletRow!.locked).toBeCloseTo(moved);

    expect(mockWithdrawals).toHaveLength(1);
    expect(mockWithdrawals[0].asset).toBe("USDT");
    expect(mockWithdrawals[0].amount).toBeCloseTo(10);
    expect(mockWithdrawals[0].status).toBe("pending");
  });

  it("rifiuta la richiesta se l'available è insufficiente", async () => {
    const caller = createCaller();

    // available troppo basso: totalToLock = 11 > 5
    if (mockWalletRow) {
      mockWalletRow.available = 5;
    }

    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr_test_12345",
        twoFactorCode: "123456",
      })
    ).rejects.toBeInstanceOf(TRPCError);

    // nessuna withdrawal creata
    expect(mockWithdrawals).toHaveLength(0);
    // nessun lock modificato
    expect(mockWalletRow!.locked).toBe(0);
    expect(mockWalletRow!.available).toBe(5);
  });
});
