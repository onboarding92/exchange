import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import { listActivePlans, listUserStakes, calcRewards, StakingPlan } from "./staking";
import { logSecurity, logWarn } from "./logger";

const assetSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/, "Asset must be uppercase (e.g. USDT, BTC)");

export const stakingRouter = router({
  // Public list of active staking plans
  listPlans: publicProcedure.query(() => {
    const plans = listActivePlans();
    return plans;
  }),

  // List stakes for the current user
  myStakes: authedProcedure.query(({ ctx }) => {
    const user = ctx.user!;
    const stakes = listUserStakes(user.id);
    return stakes;
  }),

  // Create a new stake
  createStake: authedProcedure
    .input(
      z.object({
        planId: z.number().int().positive(),
        amount: z.number().positive().max(1_000_000_000),
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const userId = user.id;

      const plan = db
        .prepare(
          "SELECT id, name, asset, apr, lockDays, minAmount, maxAmount, isActive FROM stakingPlans WHERE id = ?"
        )
        .get(input.planId) as StakingPlan | undefined;

      if (!plan || !plan.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Staking plan not found or inactive.",
        });
      }

      if (input.amount < plan.minAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum amount for this plan is ${plan.minAmount}.`,
        });
      }

      if (plan.maxAmount && input.amount > plan.maxAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum amount for this plan is ${plan.maxAmount}.`,
        });
      }

      // Check wallet balance
      const wallet = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        )
        .get(userId, plan.asset) as { balance: number } | undefined;

      if (!wallet || wallet.balance < input.amount) {
        logWarn("Staking failed: insufficient balance", {
          userId,
          asset: plan.asset,
          requestedAmount: input.amount,
          balance: wallet?.balance ?? 0,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient balance for staking.",
        });
      }

      const now = new Date();
      const startAt = now.toISOString();
      const unlockAt = new Date(
        now.getTime() + plan.lockDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const tx = (db as any).transaction(
        (
          userId: number,
          asset: string,
          amount: number,
          planId: number,
          apr: number,
          lockDays: number,
          startAt: string,
          unlockAt: string
        ) => {
          // Subtract funds from wallet
          db.prepare(
            "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
          ).run(amount, userId, asset);

          // Insert stake
          db.prepare(
            `INSERT INTO userStakes
              (userId, planId, asset, amount, apr, lockDays, startAt, unlockAt, claimedRewards, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')`
          ).run(
            userId,
            planId,
            asset,
            amount,
            apr,
            lockDays,
            startAt,
            unlockAt
          );
        }
      );

      tx(
        userId,
        plan.asset,
        input.amount,
        plan.id,
        plan.apr,
        plan.lockDays,
        startAt,
        unlockAt
      );

      logSecurity("Created staking position", {
        userId,
        planId: plan.id,
        asset: plan.asset,
        amount: input.amount,
      });

      return { success: true };
    }),

  // Claim a stake (principal + rewards) after lock ends
  claimStake: authedProcedure
    .input(
      z.object({
        stakeId: z.number().int().positive(),
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const userId = user.id;

      const stake = db
        .prepare(
          `SELECT id, userId, planId, asset, amount, apr, lockDays,
                  startAt, unlockAt, claimedRewards, status
           FROM userStakes
           WHERE id = ?`
        )
        .get(input.stakeId) as any;

      if (!stake || stake.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stake not found.",
        });
      }

      if (stake.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This stake is not active.",
        });
      }

      const now = new Date();
      const unlockAt = new Date(stake.unlockAt);
      if (now.getTime() < unlockAt.getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stake is still locked.",
        });
      }

      const totalReward = calcRewards(
        {
          amount: stake.amount,
          apr: stake.apr,
          startAt: stake.startAt,
          unlockAt: stake.unlockAt,
        },
        now
      );

      const rewardToCredit = Math.max(0, totalReward - stake.claimedRewards);
      const principal = stake.amount;

      const tx = (db as any).transaction(
        (
          userId: number,
          asset: string,
          principal: number,
          reward: number,
          stakeId: number
        ) => {
          // Credit wallet with principal + reward
          const existing = db
            .prepare(
              "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
            )
            .get(userId, asset) as { balance: number } | undefined;

          if (existing) {
            db.prepare(
              "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
            ).run(principal + reward, userId, asset);
          } else {
            db.prepare(
              "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
            ).run(userId, asset, principal + reward);
          }

          db.prepare(
            "UPDATE userStakes SET status = 'claimed', claimedRewards = claimedRewards + ? WHERE id = ?"
          ).run(reward, stakeId);
        }
      );

      tx(userId, stake.asset, principal, rewardToCredit, stake.id);

      logSecurity("Stake claimed", {
        userId,
        stakeId: stake.id,
        principal,
        rewardToCredit,
      });

      return {
        success: true,
        principal,
        reward: rewardToCredit,
      };
    }),
});
