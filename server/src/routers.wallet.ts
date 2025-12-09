import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import { authenticator } from "otplib";
import { getTwoFactor } from "./twoFactor";
import { logInfo, logWarn, logSecurity } from "./logger";
import { getUsdPrices } from "./marketPrices";
import { sendWithdrawalRequestEmail } from "./email";
import { logActivity } from "./activity";
import { extractClientIp } from "./rateLimit";

const assetSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(
    /^[A-Z0-9]+$/,
    "Asset must be uppercase letters/numbers (e.g. BTC, ETH)"
  );

export const walletRouter = router({
  // === MARKET PRICES (public) ===
  marketPrices: publicProcedure
    .input(
      z.object({
        assets: z
          .array(assetSchema)
          .min(1)
          .max(100)
          .refine((arr) => new Set(arr).size === arr.length, {
            message: "Assets must be unique",
          }),
      })
    )
    .query(async ({ input }) => {
      const prices = await getUsdPrices(input.assets);
      return prices;
    }),

  // === BALANCES (authed) ===
  balances: authedProcedure.query(({ ctx }) => {
    const rows = db
      .prepare(
        `
      SELECT asset, balance, locked, available
      FROM wallets
      WHERE userId = ?
      ORDER BY asset ASC
    `
      )
      .all(ctx.user!.id) as {
        asset: string;
        balance: number;
        locked: number | null;
        available: number | null;
      }[];

    return rows.map((row) => ({
      asset: row.asset,
      balance: row.balance,
      locked: typeof row.locked === "number" ? row.locked : 0,
      available:
        typeof row.available === "number"
          ? row.available
          : row.balance - (typeof row.locked === "number" ? row.locked : 0),
    }));
  }),


  // Create a deposit request (logical, not real gateway)
  createDeposit: authedProcedure
    .input(
      z.object({
        asset: assetSchema,
        amount: z.number().gt(0, "Amount must be > 0").positive().max(1_000_000_000),
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
        amount: z.number().gt(0, "Amount must be > 0").positive().max(1_000_000_000),
        address: z.string().min(10).max(200),
        twoFactorCode: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const now = new Date().toISOString();

      // Check coin configuration (enabled, minWithdraw, withdrawFee)
      const coin = db
        .prepare(
          "SELECT enabled, minWithdraw, withdrawFee FROM coins WHERE asset=?"
        )
        .get(input.asset) as
        | {
            enabled: number;
            minWithdraw: number;
            withdrawFee: number;
          }
        | undefined;

      if (!coin || !coin.enabled) {
        logWarn("Withdrawal failed: asset not enabled", {
          userId: ctx.user!.id,
          asset: input.asset,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This asset is not available for withdrawals.",
        });
      }

      if (coin.minWithdraw > 0 && input.amount < coin.minWithdraw) {
        logWarn("Withdrawal failed: below minWithdraw", {
          userId: ctx.user!.id,
          asset: input.asset,
          requestedAmount: input.amount,
          minWithdraw: coin.minWithdraw,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum withdrawal for ${input.asset} is ${coin.minWithdraw}`,
        });
      }

      const fee = coin.withdrawFee ?? 0;
      if (fee > 0 && input.amount <= fee) {
        logWarn("Withdrawal failed: amount too small to cover fee", {
          userId: ctx.user!.id,
          asset: input.asset,
          requestedAmount: input.amount,
          withdrawFee: fee,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Withdrawal amount is too small to cover network/withdrawal fee.",
        });
      }

      // Basic balance check (using available/locked if present)
      const wallet = db
        .prepare(
          "SELECT balance, locked, available FROM wallets WHERE userId=? AND asset=?"
        )
        .get(ctx.user!.id, input.asset) as
        | { balance: number; locked?: number | null; available?: number | null }
        | undefined;

      const walletLocked = wallet?.locked ?? 0;
      const walletAvailable =
        wallet?.available != null
          ? wallet.available
          : (wallet?.balance ?? 0) - walletLocked;

      const totalToLock = input.amount + fee;

      if (!wallet || wallet.balance <= 0 || walletAvailable < totalToLock) {
        logWarn("Withdrawal failed: insufficient balance", {
          userId: ctx.user!.id,
          asset: input.asset,
          requestedAmount: input.amount,
          withdrawFee: fee,
          balance: wallet?.balance ?? 0,
          locked: walletLocked,
          available: walletAvailable,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient available balance for withdrawal.",
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
            message:
              "Two-factor code required because 2FA is enabled on your account.",
          });
        }

        const isValid = authenticator.check(
          input.twoFactorCode,
          twofa.secret
        );
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

      // Insert withdrawal
      const nowIso = now;
      db.prepare(
        `INSERT INTO withdrawals (userId,asset,amount,address,status,createdAt)
         VALUES (?,?,?,?,?,?)`
      ).run(
        ctx.user!.id,
        input.asset,
        input.amount,
        input.address,
        "pending",
        nowIso
      );

      // Lock funds (amount + fee) by moving from available to locked
      db.prepare(
        `
        UPDATE wallets
        SET locked = locked + ?, available = available - ?
        WHERE userId=? AND asset=?
      `
      ).run(totalToLock, totalToLock, ctx.user!.id, input.asset);

      // Lock funds (amount + fee) by moving from available to locked
      db.prepare(
        `
        UPDATE wallets
        SET locked = locked + ?, available = available - ?
        WHERE userId=? AND asset=?
      `
      ).run(totalToLock, totalToLock, ctx.user!.id, input.asset);

      // Email + activity log for withdrawal request
      try {
        const lastWd = db
          .prepare(
            "SELECT id, asset, amount, address FROM withdrawals WHERE userId=? ORDER BY createdAt DESC LIMIT 1"
          )
          .get(ctx.user!.id) as
          | { id: number; asset: string; amount: number; address: string }
          | undefined;

        const req = ctx.req as any;
        const ip = extractClientIp(req);
        const userAgent =
          typeof req?.headers?.["user-agent"] === "string"
            ? req.headers["user-agent"]
            : null;

        if (ctx.user?.email && lastWd) {
          void sendWithdrawalRequestEmail({
            to: ctx.user.email,
            asset: lastWd.asset,
            amount: lastWd.amount,
            address: lastWd.address,
            ip,
            userAgent,
          }).catch((err) => {
            console.error(
              "[email] Failed to enqueue withdrawal request email:",
              err
            );
          });
        }

        void logActivity({
          userId: ctx.user!.id,
          type: "withdrawal_request",
          details: {
            asset: input.asset,
            amount: input.amount,
            address: input.address,
          },
        }).catch((err) => {
          console.error(
            "[activity] Failed to handle withdrawal request activity:",
            err
          );
        });
      } catch (err) {
        console.error(
          "[withdrawal] Non-fatal error while handling notifications/logs:",
          err
        );
      }

      logSecurity("Withdrawal request created", {
        userId: ctx.user!.id,
        asset: input.asset,
        amount: input.amount,
        address: input.address,
      });

      // For a real exchange, you might decrement available balance here or lock funds.

      return { success: true };
    }),

  // Admin: approva un withdrawal pendente e scarica i fondi dal wallet (locked -> fuori exchange)
  approveWithdrawal: authedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const withdrawal = db
        .prepare(
          `
          SELECT id, userId, asset, amount, fee, status
          FROM withdrawals
          WHERE id = ?
        `
        )
        .get(input.id) as
        | {
            id: number;
            userId: number;
            asset: string;
            amount: number;
            fee?: number | null;
            status: string;
          }
        | undefined;

      if (!withdrawal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Withdrawal not found",
        });
      }

      if (withdrawal.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Withdrawal is not pending.",
        });
      }

      const total = withdrawal.amount + (withdrawal.fee ?? 0);

      const wallet = db
        .prepare(
          `
          SELECT balance, locked, available
          FROM wallets
          WHERE userId = ? AND asset = ?
        `
        )
        .get(withdrawal.userId, withdrawal.asset) as
        | { balance: number; locked: number | null; available: number | null }
        | undefined;

      if (!wallet) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wallet not found for asset.",
        });
      }

      const locked = wallet.locked ?? 0;
      if (locked < total) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient locked funds to approve withdrawal.",
        });
      }

      const newBalance = wallet.balance - total;
      const newLocked = locked - total;
      const newAvailable =
        wallet.available != null ? wallet.available : newBalance - newLocked;

      const now = new Date().toISOString();

      const updateWalletRes = db
        .prepare(
          `
          UPDATE wallets
          SET balance = ?, locked = ?, available = ?
          WHERE userId = ? AND asset = ?
        `
        )
        .run(
          newBalance,
          newLocked,
          newAvailable,
          withdrawal.userId,
          withdrawal.asset
        ) as any;

      if (!updateWalletRes || updateWalletRes.changes !== 1) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update wallet on approveWithdrawal.",
        });
      }

      db.prepare(
        `
        UPDATE withdrawals
        SET status = 'approved', updatedAt = ?
        WHERE id = ?
      `
      ).run(now, withdrawal.id);

      return { ok: true };
    }),

});
