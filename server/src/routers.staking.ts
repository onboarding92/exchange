import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import {
  listActiveStakingProducts,
  listUserPositions,
  calculateAccruedReward,
} from "./staking";
import { TRPCError } from "@trpc/server";
import { logSecurity } from "./logger";
import { idSchema, cryptoAmountSchema } from "./validation";

export const stakingRouter = router({
  // Public – list active staking products
  listProducts: publicProcedure.query(() => {
    return listActiveStakingProducts();
  }),

  // User – list own positions with computed rewards
  myPositions: authedProcedure.query(({ ctx }) => {
    const user = ctx.user!;
    const rows = listUserPositions(user.id);
    return rows.map((p) => ({
      ...p,
      accruedReward: calculateAccruedReward(p),
    }));
  }),

  // User – stake from wallet
  stake: authedProcedure
    .input(
      z.object({
        productId: idSchema,
        amount: cryptoAmountSchema,
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date().toISOString();

      const product = db
        .prepare(
          `SELECT id, asset, name, apr, lockDays, minAmount, maxAmount, isActive
           FROM stakingProducts
           WHERE id = ?`
        )
        .get(input.productId) as
        | {
            id: number;
            asset: string;
            name: string;
            apr: number;
            lockDays: number;
            minAmount: number;
            maxAmount: number | null;
            isActive: number;
          }
        | undefined;

      if (!product || !product.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Staking product not available.",
        });
      }

      if (input.amount < product.minAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum amount is ${product.minAmount} ${product.asset}.`,
        });
      }

      if (product.maxAmount !== null && input.amount > product.maxAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum amount is ${product.maxAmount} ${product.asset}.`,
        });
      }

      const walletRow = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        )
        .get(user.id, product.asset) as { balance: number } | undefined;

      const currentBalance = walletRow?.balance ?? 0;
      if (currentBalance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient ${product.asset} balance.`,
        });
      }

      try {
        const tx = (db as any).transaction(
          (
            userId: number,
            productId: number,
            asset: string,
            amount: number,
            apr: number,
            lockDays: number,
            now: string
          ) => {
            // deduct from wallet
            db.prepare(
              "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
            ).run(amount, userId, asset);

            // create position
            const res = db
              .prepare(
                `INSERT INTO stakingPositions
                  (userId, productId, asset, amount, apr, lockDays, startedAt, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
              )
              .run(userId, productId, asset, amount, apr, lockDays, now);

            const positionId = Number(res.lastInsertRowid);
            return positionId;
          }
        );

        const positionId = tx(
          user.id,
          product.id,
          product.asset,
          input.amount,
          product.apr,
          product.lockDays,
          now
        );

        logSecurity("Staking created", {
          userId: user.id,
          productId: product.id,
          positionId,
          amount: input.amount,
          asset: product.asset,
        });

        return { success: true, positionId };
      } catch (err) {
        console.error("[staking] Failed to create staking position:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create staking position. Please try again later.",
        });
      }
    }),

  // User – unstake (after lock period)
  unstake: authedProcedure
    .input(
      z.object({
        positionId: idSchema,
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date();

      const pos = db
        .prepare(
          `SELECT id, userId, productId, asset, amount, apr, lockDays,
                  startedAt, closedAt, status
           FROM stakingPositions
           WHERE id = ?`
        )
        .get(input.positionId) as
        | {
            id: number;
            userId: number;
            productId: number;
            asset: string;
            amount: number;
            apr: number;
            lockDays: number;
            startedAt: string;
            closedAt: string | null;
            status: string;
          }
        | undefined;

      if (!pos || pos.userId !== user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Position not found.",
        });
      }

      if (pos.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This position is already closed.",
        });
      }

      const startedAt = new Date(pos.startedAt);
      const diffDays =
        (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays < pos.lockDays) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This staking is locked for ${pos.lockDays} days. You can unstake after the lock period.`,
        });
      }

      const reward = calculateAccruedReward({
        amount: pos.amount,
        apr: pos.apr,
        startedAt: pos.startedAt,
        closedAt: now.toISOString(),
        status: "closed",
      });

      try {
        const tx = (db as any).transaction(
          (
            positionId: number,
            userId: number,
            asset: string,
            principal: number,
            rewardAmount: number,
            closedAtIso: string
          ) => {
            // close position
            db.prepare(
              `UPDATE stakingPositions
               SET status = 'closed', closedAt = ?
               WHERE id = ?`
            ).run(closedAtIso, positionId);

            const totalReturn = principal + rewardAmount;

            // credit wallet
            const existing = db
              .prepare(
                "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
              )
              .get(userId, asset) as { balance: number } | undefined;

            if (existing) {
              db.prepare(
                "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
              ).run(totalReturn, userId, asset);
            } else {
              db.prepare(
                "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
              ).run(userId, asset, totalReturn);
            }
          }
        );

        const closedAtIso = now.toISOString();
        tx(pos.id, user.id, pos.asset, pos.amount, reward, closedAtIso);

        logSecurity("Staking closed", {
          userId: user.id,
          positionId: pos.id,
          asset: pos.asset,
          principal: pos.amount,
          reward,
        });

        return {
          success: true,
          reward,
        };
      } catch (err) {
        console.error("[staking] Failed to close staking position:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to close staking position. Please try again later.",
        });
      }
    }),
});
