import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import { authenticator } from "otplib";
import { getTwoFactor } from "./twoFactor";
import { logInfo, logWarn, logSecurity } from "./logger";
import { getUsdPrices } from "./marketPrices";

const assetSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");

export const walletRouter = router({
  // === MARKET PRICES (public) ===
  marketPrices: publicProcedure
    .input(
      z.object({
        assets: z
          .array(assetSchema)
          .min(1)
          .max(50),
      })
    )
    .query(async ({ input }) => {
      const prices = await getUsdPrices(input.assets);
      return prices;
    }),

  // Return all wallets (balances) for current user
  balances: authedProcedure.query(({ ctx }) => {
    const rows = db
      .prepare(
        "SELECT asset,balance FROM wallets WHERE userId=? ORDER BY asset ASC"
      )
      .all(ctx.user!.id) as { asset: string; balance: number }[];

    return rows;
  }),

  // Return all deposits for current user
  deposits: authedProcedure.query(({ ctx }) => {
    const rows = db
      .prepare(
        "SELECT id,asset,amount,gateway,status,createdAt FROM deposits WHERE userId=? ORDER BY createdAt DESC"
      )
      .all(ctx.user!.id) as any[];

    return rows;
  }),

  // Return all withdrawals for current user
  withdrawals: authedProcedure.query(({ ctx }) => {
    const rows = db
      .prepare(
        "SELECT id,asset,amount,address,status,createdAt,reviewedAt FROM withdrawals WHERE userId=? ORDER BY createdAt DESC"
      )
      .all(ctx.user!.id) as any[];

    return rows;
  }),

  // Create a deposit request (logical, not real gateway)
  createDeposit: authedProcedure
    .input(
      z.object({
        asset: assetSchema,
        amount: z.number().positive().max(1_000_000_000),
        gateway: z.string().min(2).max(50),
      })
    )
    .mutation(({ input, ctx }) => {
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO deposits (userId,asset,amount,gateway,status,createdAt)
         VALUES (?,?,?,?,?,?)`
      ).run(
        ctx.user!.id,
        input.asset,
        input.amount,
        input.gateway,
        "pending",
        now
      );

      logInfo("Deposit request created", {
        userId: ctx.user!.id,
        asset: input.asset,
        amount: input.amount,
        gateway: input.gateway,
      });

      return { success: true };
    }),

  // Request a withdrawal (with 2FA enforcement)
  requestWithdrawal: authedProcedure
    .input(
      z.object({
        asset: assetSchema,
        amount: z.number().positive().max(1_000_000_000),
        address: z.string().min(10).max(200),
        twoFactorCode: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const now = new Date().toISOString();

      // Basic balance check
      const wallet = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId=? AND asset=?"
        )
        .get(ctx.user!.id, input.asset) as { balance: number } | undefined;

      if (!wallet || wallet.balance <= 0 || wallet.balance < input.amount) {
        logWarn("Withdrawal failed: insufficient balance", {
          userId: ctx.user!.id,
          asset: input.asset,
          requestedAmount: input.amount,
          balance: wallet?.balance ?? 0,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient balance for withdrawal.",
        });
      }

      // 2FA enforcement: if user has 2FA enabled, they MUST provide a valid code
      const twofa = getTwoFactor(ctx.user!.id);
      if (twofa && twofa.enabled) {
        if (!input.twoFactorCode) {
          logWarn("Withdrawal blocked: 2FA required but not provided", {
            userId: ctx.user!.id,
            asset: input.asset,
            amount: input.amount,
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "TWO_FACTOR_REQUIRED_WITHDRAWAL",
          });
        }
        const isValid = authenticator.check(input.twoFactorCode, twofa.secret);
        if (!isValid) {
          logWarn("Withdrawal blocked: invalid 2FA code", {
            userId: ctx.user!.id,
            asset: input.asset,
            amount: input.amount,
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid two-factor code for withdrawal.",
          });
        }
      }

      // Insert withdrawal request as pending
      db.prepare(
        `INSERT INTO withdrawals (userId,asset,amount,address,status,createdAt)
         VALUES (?,?,?,?,?,?)`
      ).run(
        ctx.user!.id,
        input.asset,
        input.amount,
        input.address,
        "pending",
        now
      );

      logSecurity("Withdrawal request created", {
        userId: ctx.user!.id,
        asset: input.asset,
        amount: input.amount,
        address: input.address,
      });

      // For a real exchange, you might decrement available balance here or lock funds.

      return { success: true };
    }),
});
