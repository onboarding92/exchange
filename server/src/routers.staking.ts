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
import { logActivity } from "./activity";
import { extractClientIp } from "./rateLimit";

export const stakingRouter = router({
  // Public – list active staking products
  listProducts: publicProcedure.query(() => {
    return listActiveStakingProducts();
  }),

  // User – list own positions with computed rewards
  myPositions: authedProcedure.query(({ ctx }) => {
    const user = ctx.user!;
    const rows = listUserPositions(user.id);

    return rows.map((p) => {
      const accruedReward = calculateAccruedReward(p);
      const roiPercent =
        p.amount > 0 ? (accruedReward / p.amount) * 100 : 0;

      return {
        ...p,
        accruedReward,
        roiPercent,
      };
    });
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

      const req = ctx.req as any;
      const ip = extractClientIp(req);
      const userAgent = req?.headers?.["user-agent"] ?? null;

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
            db.prepare(
              "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
            ).run(amount, userId, asset);

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

        // Activity log
        try {
          logActivity({
            userId: user.id,
            type: "staking_stake",
            category: "staking",
            description: `Staked ${input.amount} ${product.asset} in ${product.name}`,
            metadata: {
              positionId,
              productId: product.id,
              asset: product.asset,
              amount: input.amount,
              apr: product.apr,
              lockDays: product.lockDays,
            },
            ip,
            userAgent,
          });
        } catch (err) {
          console.error("[activity] Failed to log staking stake activity:", err);
        }

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

      const req = ctx.req as any;
      const ip = extractClientIp(req);
      const userAgent = req?.headers?.["user-agent"] ?? null;

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
            db.prepare(
              `UPDATE stakingPositions
               SET status = 'closed', closedAt = ?
               WHERE id = ?`
            ).run(closedAtIso, positionId);

            const totalReturn = principal + rewardAmount;

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

        // Activity log
        try {
          logActivity({
            userId: user.id,
            type: "staking_unstake",
            category: "staking",
            description: `Unstaked ${pos.amount} ${pos.asset} (reward: ${reward})`,
            metadata: {
              positionId: pos.id,
              asset: pos.asset,
              principal: pos.amount,
              reward,
            },
            ip,
            userAgent,
          });
        } catch (err) {
          console.error("[activity] Failed to log staking unstake activity:", err);
        }

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
