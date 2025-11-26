/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// =======================
// Mock state
// =======================
let mockUserRow:
  | {
      id: number;
      email: string;
      password: string;
      role: string;
    }
  | null = null;

let mockTwoFactorRow:
  | {
      enabled: number;
      secret: string;
    }
  | null = null;

// =======================
// Mocks (senza usare variabili esterne nelle factory)
// =======================

// Mock db: SELECT FROM users WHERE email=?
vi.mock("./db", () => {
  const db = {
    prepare(sql: string) {
      return {
        get: (...args: any[]) => {
          if (sql.includes("FROM users WHERE email=?")) {
            return mockUserRow || undefined;
          }
          return undefined;
        },
        all: (..._args: any[]) => [],
        run: (..._args: any[]) => ({ changes: 1 }),
      };
    },
  };
  return { db };
});

// Mock bcrypt: password corretta = "correct-password"
vi.mock("bcryptjs", () => {
  return {
    default: {
      compare: (password: string, _hash: string) =>
        Promise.resolve(password === "correct-password"),
      hash: vi.fn(),
      hashSync: vi.fn(),
    },
  };
});

// Mock session: crea un token finto
vi.mock("./session", () => {
  return {
    createSession: vi.fn(() => "FAKE_SESSION_TOKEN"),
    destroySession: vi.fn(),
  };
});

// Mock twoFactor
vi.mock("./twoFactor", () => {
  return {
    getTwoFactor: (userId: number) => {
      if (!mockTwoFactorRow) return null;
      return { userId, ...mockTwoFactorRow };
    },
    upsertTwoFactor: vi.fn(),
    setTwoFactorEnabled: vi.fn(),
    disableTwoFactor: vi.fn(),
  };
});

// Mock otplib.authenticator.check per 2FA
vi.mock("otplib", () => {
  return {
    authenticator: {
      check: (code: string, secret: string) => {
        // codice valido: "123456" con qualsiasi secret non vuota
        return code === "123456" && !!secret;
      },
      generateSecret: vi.fn(() => "SECRET"),
      keyuri: vi.fn(() => "otpauth://totp/..."),
    },
  };
});

// Mock email (alert login, ecc.)
vi.mock("./email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendSupportReplyEmail: vi.fn().mockResolvedValue(undefined),
  sendLoginAlertEmail: vi.fn().mockResolvedValue(undefined),
  sendWithdrawalRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendWithdrawalStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock activity log
vi.mock("./activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock loginEvents
vi.mock("./loginEvents", () => ({
  recordLoginEvent: vi.fn(),
  getRecentLogins: vi.fn(() => []),
}));

// Mock logger per evitare rumore
vi.mock("./logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logSecurity: vi.fn(),
}));

// =======================
// Import del router (dopo i mock)
// =======================
import { authRouter } from "./routers.auth";

function createCaller() {
  const ctx = {
    user: null,
    req: {
      headers: {
        "user-agent": "Vitest",
      },
      socket: {
        remoteAddress: "127.0.0.1",
      },
      cookies: {},
    },
    res: {
      cookie: vi.fn(),
    },
  } as any;

  return authRouter.createCaller(ctx);
}

describe("auth.login con password e 2FA", () => {
  beforeEach(() => {
    mockUserRow = {
      id: 1,
      email: "user@test.com",
      password: "HASH",
      role: "user",
    };
    mockTwoFactorRow = null;
  });

  it("login ok con password corretta e 2FA disattivata", async () => {
    const caller = createCaller();

    const result = await caller.login({
      email: "user@test.com",
      password: "correct-password",
    });

    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe("user@test.com");
  });

  it("fallisce con password sbagliata", async () => {
    const caller = createCaller();

    await expect(
      caller.login({
        email: "user@test.com",
        password: "wrong-password",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("richiede 2FA quando abilitata (senza codice)", async () => {
    const caller = createCaller();
    mockTwoFactorRow = {
      enabled: 1,
      secret: "SECRET",
    };

    await expect(
      caller.login({
        email: "user@test.com",
        password: "correct-password",
      })
    ).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
      message: "TWO_FACTOR_REQUIRED",
    });
  });

  it("fallisce con codice 2FA sbagliato", async () => {
    const caller = createCaller();
    mockTwoFactorRow = {
      enabled: 1,
      secret: "SECRET",
    };

    await expect(
      caller.login({
        email: "user@test.com",
        password: "correct-password",
        twoFactorCode: "000000",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("login ok con codice 2FA corretto", async () => {
    const caller = createCaller();
    mockTwoFactorRow = {
      enabled: 1,
      secret: "SECRET",
    };

    const result = await caller.login({
      email: "user@test.com",
      password: "correct-password",
      twoFactorCode: "123456",
    });

    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe("user@test.com");
  });
});
