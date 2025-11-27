/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock in-memory per wallets e withdrawals
type WalletRow = {
  userId: number;
  asset: string;
  balance: number;
  locked: number | null;
  available: number | null;
};

type WithdrawalRow = {
  id: number;
  userId: number;
  asset: string;
  amount: number;
  fee: number | null;
  status: string;
};

let mockWallets: WalletRow[] = [];
let mockWithdrawals: WithdrawalRow[] = [];

// Mock del modulo ./db PRIMA di importare i router
vi.mock("./db", () => {
  return {
    db: {
      prepare: (sql: string) => {
        return {
          get: (...args: any[]) => {
            // seedDemoProducts: SELECT COUNT(*) as c FROM stakingProducts
            if (
              sql.toLowerCase().includes("from stakingproducts") &&
              sql.toLowerCase().includes("count(*)")
            ) {
              return { c: 0 };
            }

            // SELECT withdrawal by id
            if (
              sql.toLowerCase().includes("from withdrawals") &&
              sql.toLowerCase().includes("where id =")
            ) {
              const [id] = args;
              return mockWithdrawals.find((w) => w.id === id) ?? undefined;
            }

            // SELECT wallet per userId + asset
            if (
              sql.toLowerCase().includes("from wallets") &&
              sql.toLowerCase().includes("where userid") &&
              sql.toLowerCase().includes("and asset")
            ) {
              const [userId, asset] = args;
              return (
                mockWallets.find(
                  (w) => w.userId === userId && w.asset === asset
                ) ?? undefined
              );
            }

            return undefined;
          },
          all: (..._args: any[]) => {
            // Non ci serve in questo test
            return [];
          },
          run: (...args: any[]) => {
            // UPDATE wallets SET balance = ?, locked = ?, available = ?
            if (
              sql.toLowerCase().includes("update wallets") &&
              sql.toLowerCase().includes("set balance") &&
              sql.toLowerCase().includes("locked =") &&
              sql.toLowerCase().includes("available =")
            ) {
              const [balance, locked, available, userId, asset] = args;
              const w = mockWallets.find(
                (w) => w.userId === userId && w.asset === asset
              );
              if (!w) {
                throw new Error("Wallet not found in mock (UPDATE wallets).");
              }
              w.balance = balance;
              w.locked = locked;
              w.available = available;
              return { changes: 1 };
            }

            // UPDATE withdrawals SET status = 'approved', updatedAt = ?
            if (
              sql.toLowerCase().includes("update withdrawals") &&
              sql.toLowerCase().includes("set status = 'approved'")
            ) {
              const [_updatedAt, id] = args;
              const wd = mockWithdrawals.find((w) => w.id === id);
              if (wd) {
                wd.status = "approved";
                return { changes: 1 };
              }
              return { changes: 0 };
            }

            return { changes: 1 };
          },
        };
      },
    },
  };
});

// Dopo il mock, importiamo il router
import { appRouter } from "./routers";

// Helper per creare un caller con utente admin
function createAdminCaller() {
  const ctx: any = {
    user: {
      id: 999,
      email: "admin@example.com",
      role: "admin",
      twoFactorEnabled: false,
    },
    sessionId: "test-session",
    req: {} as any,
    res: {} as any,
    ip: "127.0.0.1",
  };
  return appRouter.createCaller(ctx);
}

describe("admin.approveWithdrawal", () => {
  beforeEach(() => {
    mockWallets = [
      {
        userId: 1,
        asset: "USDT",
        balance: 1000,
        locked: 20,
        available: 980,
      },
    ];
    mockWithdrawals = [
      {
        id: 1,
        userId: 1,
        asset: "USDT",
        amount: 10,
        fee: 1,
        status: "pending",
      },
    ];
  });

  it("approva un withdrawal pending e aggiorna il wallet (locked/balance/available)", async () => {
    const caller = createAdminCaller();

    await caller.wallet.approveWithdrawal({ id: 1 });

    const wd = mockWithdrawals.find((w) => w.id === 1)!;
    expect(wd.status).toBe("approved");

    const w = mockWallets.find(
      (w) => w.userId === 1 && w.asset === "USDT"
    )!;
    // Partiva con balance=1000, locked=20, available=980
    // total = amount(10) + fee(1) = 11
    // Nuovo balance = 1000 - 11 = 989
    // Nuovo locked = 20 - 11 = 9
    // available = balance - locked = 980 (invariante in questo modello)
    expect(w.balance).toBeCloseTo(989);
    expect(w.locked ?? 0).toBeCloseTo(9);
    expect(w.available ?? 0).toBeCloseTo(980);
  });

  it("fallisce se il withdrawal non è pending", async () => {
    const caller = createAdminCaller();
    // Forziamo lo stato a 'approved'
    mockWithdrawals[0].status = "approved";

    await expect(caller.wallet.approveWithdrawal({ id: 1 })).rejects.toBeInstanceOf(
      TRPCError
    );
  });

  it("fallisce se i fondi locked sono insufficienti", async () => {
    const caller = createAdminCaller();
    // locked troppo bassi
    mockWallets[0].locked = 5;

    await expect(caller.wallet.approveWithdrawal({ id: 1 })).rejects.toBeInstanceOf(
      TRPCError
    );
  });
});
