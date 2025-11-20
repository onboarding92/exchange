import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import { authenticator } from "otplib";
import { getTwoFactor } from "./twoFactor";

export const walletRouter = router({
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
        asset: z.string().min(2),
        amount: z.number().positive(),
        gateway: z.string().min(2),
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

      return { success: true };
    }),

  // Request a withdrawal (with 2FA enforcement)
  requestWithdrawal: authedProcedure
    .input(
      z.object({
        asset: z.string().min(2),
        amount: z.number().positive(),
        address: z.string().min(10),
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient balance for withdrawal.",
        });
      }

      // 2FA enforcement: if user has 2FA enabled, they MUST provide a valid code
      const twofa = getTwoFactor(ctx.user!.id);
      if (twofa && twofa.enabled) {
        if (!input.twoFactorCode) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "TWO_FACTOR_REQUIRED_WITHDRAWAL",
          });
        }
        const isValid = authenticator.check(input.twoFactorCode, twofa.secret);
        if (!isValid) {
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

      // Optional: you can choose to freeze or subtract balance here.
      // For demo: we leave the actual balance unchanged and let admin approval handle accounting.

      return { success: true };
    }),
});
