import { router, authedProcedure, adminProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { sendEmail } from "./email";

export const stakingRouter = router({
  listPlans: authedProcedure.query(() => {
    return db.prepare("SELECT * FROM stakingPlans WHERE active=1").all();
  }),
  myStakes: authedProcedure.query(({ ctx }) => {
    return db.prepare(`
      SELECT s.*, p.asset, p.apr, p.lockDays
      FROM userStakes s
      JOIN stakingPlans p ON p.id = s.planId
      WHERE s.userId=?
      ORDER BY s.startedAt DESC
    `).all(ctx.user!.id);
  }),
  stake: authedProcedure
    .input(z.object({ planId: z.number().int(), amount: z.number().positive() }))
    .mutation(({ ctx, input }) => {
      const plan = db.prepare("SELECT * FROM stakingPlans WHERE id=? AND active=1").get(input.planId) as any;
      if (!plan) throw new Error("Invalid plan");
      if (input.amount < plan.minAmount) throw new Error("Amount below minimum");
      const balRow = db.prepare("SELECT balance FROM wallets WHERE userId=? AND asset=?")
        .get(ctx.user!.id, plan.asset) as any;
      const bal = balRow?.balance ?? 0;
      if (bal < input.amount) throw new Error("Insufficient balance");
      db.prepare("UPDATE wallets SET balance=balance-? WHERE userId=? AND asset=?")
        .run(input.amount, ctx.user!.id, plan.asset);
      const now = new Date();
      const ends = new Date(now.getTime() + plan.lockDays * 24 * 3600 * 1000);
      db.prepare(`
        INSERT INTO userStakes (userId,planId,amount,startedAt,endsAt)
        VALUES (?,?,?,?,?)
      `).run(ctx.user!.id, input.planId, input.amount, now.toISOString(), ends.toISOString());
      if (ctx.user?.email) {
        void sendEmail(ctx.user.email, "Staking started", `You staked ${input.amount} ${plan.asset} for ${plan.lockDays} days.`);
      }
      return { success: true };
    }),
  claim: authedProcedure
    .input(z.object({ stakeId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const stake = db.prepare(`
        SELECT s.*, p.asset, p.apr
        FROM userStakes s
        JOIN stakingPlans p ON p.id = s.planId
        WHERE s.id=? AND s.userId=?
      `).get(input.stakeId, ctx.user!.id) as any;
      if (!stake) throw new Error("Stake not found");
      if (stake.closedAt) throw new Error("Already claimed");
      const now = new Date();
      const end = new Date(stake.endsAt);
      if (now < end) throw new Error("Stake still locked");
      const days = (end.getTime() - new Date(stake.startedAt).getTime()) / (24 * 3600 * 1000);
      const reward = stake.amount * (stake.apr / 100) * (days / 365);
      db.prepare("UPDATE userStakes SET closedAt=?, reward=? WHERE id=?")
        .run(now.toISOString(), reward, stake.id);
      db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)")
        .run(ctx.user!.id, stake.asset, 0);
      db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?")
        .run(stake.amount + reward, ctx.user!.id, stake.asset);
      if (ctx.user?.email) {
        void sendEmail(ctx.user.email, "Staking rewards claimed", `You claimed ${reward.toFixed(8)} ${stake.asset} in rewards.`);
      }
      return { success: true, reward };
    }),
  adminCreatePlan: adminProcedure
    .input(z.object({
      asset: z.string(),
      apr: z.number().positive(),
      lockDays: z.number().int().positive(),
      minAmount: z.number().positive(),
    }))
    .mutation(({ input }) => {
      db.prepare("INSERT INTO stakingPlans (asset,apr,lockDays,minAmount,active) VALUES (?,?,?,?,1)")
        .run(input.asset, input.apr, input.lockDays, input.minAmount);
      return { success: true };
    }),
  adminListPlans: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM stakingPlans").all();
  }),
});
