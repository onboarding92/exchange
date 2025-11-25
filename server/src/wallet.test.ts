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
      balance: number;
    }
  | undefined;

// Mock del modulo db
vi.mock("./db", () => {
  const db = {
    prepare(sql: string) {
      return {
        get: (..._args: any[]) => {
          if (sql.includes("FROM coins")) {
            return mockCoinRow;
          }
          if (sql.includes("FROM wallets")) {
            return mockWalletRow;
          }
          if (sql.includes("FROM withdrawals")) {
            // select ultima withdrawal per email
            return {
              id: 1,
              asset: "USDT",
              amount: 10,
              address: "addr",
            };
          }
          return undefined;
        },
        all: (..._args: any[]) => {
          return [];
        },
        run: (..._args: any[]) => {
          // no-op per INSERT/UPDATE
          return { changes: 1 };
        },
      };
    },
  };
  return { db };
});

// Mock 2FA helper
let mockTwoFactor:
  | {
      enabled: boolean;
      secret: string;
    }
  | null = null;

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
        // Semplice regola: "123456" è valido per qualsiasi secret
        return code === "123456" && !!secret;
      }),
    },
  };
});

// Mock email (non ci serve verificare le chiamate nei test)
vi.mock("./email", () => ({
  sendWithdrawalRequestEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock activity log
vi.mock("./activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock rateLimit extractClientIp
vi.mock("./rateLimit", () => ({
  extractClientIp: (_req: any) => "127.0.0.1",
}));

// Mock logger per evitare rumore nei test
vi.mock("./logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logSecurity: vi.fn(),
}));

// Import del router dopo i mock
import { walletRouter } from "./routers.wallet";

function createCaller() {
  const ctx = {
    user: {
      id: 1,
      email: "test@example.com",
    },
    req: {
      headers: {
        "user-agent": "Vitest",
      },
    },
  } as any;

  return walletRouter.createCaller(ctx);
}

describe("wallet.requestWithdrawal", () => {
  beforeEach(() => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 0,
      withdrawFee: 0,
    };
    mockWalletRow = {
      balance: 100,
    };
    mockTwoFactor = null;
  });

  it("rifiuta se l'asset non è abilitato", async () => {
    mockCoinRow = {
      enabled: 0,
      minWithdraw: 0,
      withdrawFee: 0,
    };

    const caller = createCaller();

    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr-123456789",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "BAD_REQUEST",
    });
  });

  it("rifiuta se amount < minWithdraw", async () => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 50,
      withdrawFee: 0,
    };

    const caller = createCaller();

    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr-123456789",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "BAD_REQUEST",
    });
  });

  it("rifiuta se amount <= withdrawFee", async () => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 0,
      withdrawFee: 5,
    };

    const caller = createCaller();

    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 5,
        address: "addr-123456789",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "BAD_REQUEST",
    });
  });

  it("rifiuta se saldo insufficiente", async () => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 0,
      withdrawFee: 0,
    };
    mockWalletRow = {
      balance: 3,
    };

    const caller = createCaller();

    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr-123456789",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "BAD_REQUEST",
    });
  });

  it("accetta una richiesta valida senza 2FA", async () => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 1,
      withdrawFee: 0.1,
    };
    mockWalletRow = {
      balance: 100,
    };
    mockTwoFactor = null;

    const caller = createCaller();

    const res = await caller.requestWithdrawal({
      asset: "USDT",
      amount: 10,
      address: "addr-123456789",
    } as any);

    expect(res).toEqual({ success: true });
  });

  it("richiede un codice 2FA valido se 2FA è attivo", async () => {
    mockCoinRow = {
      enabled: 1,
      minWithdraw: 1,
      withdrawFee: 0,
    };
    mockWalletRow = {
      balance: 100,
    };
    mockTwoFactor = {
      enabled: true,
      secret: "secret-2fa",
    };

    const caller = createCaller();

    // Nessun codice -> errore
    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr-123456789",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
    });

    // Codice errato -> errore
    await expect(
      caller.requestWithdrawal({
        asset: "USDT",
        amount: 10,
        address: "addr-123456789",
        twoFactorCode: "000000",
      } as any)
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
    });

    // Codice corretto -> ok
    const okRes = await caller.requestWithdrawal({
      asset: "USDT",
      amount: 10,
      address: "addr-123456789",
      twoFactorCode: "123456",
    } as any);

    expect(okRes).toEqual({ success: true });
  });
});
