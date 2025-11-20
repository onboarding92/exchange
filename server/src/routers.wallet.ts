import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";

export const walletRouter = router({
  balances: authedProcedure.query(({ ctx }) => {
    return db.prepare("SELECT asset,balance FROM wallets WHERE userId=?").all(ctx.user!.id);
  }),
  createDeposit: authedProcedure
    .input(z.object({
      asset: z.string(),
      amount: z.number().positive(),
      gateway: z.enum(["MoonPay","Changelly","Banxa","Transak","Mercuryo","CoinGate"]),
    }))
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO deposits (userId,asset,amount,gateway,status,createdAt) VALUES (?,?,?,?,?,?)")
        .run(ctx.user!.id, input.asset, input.amount, input.gateway, "pending", now);
      return { success: true };
    }),
  withdraw: authedProcedure
    .input(z.object({
      asset: z.string(),
      amount: z.number().positive(),
      address: z.string().min(10),
    }))
    .mutation(({ ctx, input }) => {
      const balRow = db.prepare("SELECT balance FROM wallets WHERE userId=? AND asset=?")
        .get(ctx.user!.id, input.asset) as any;
      const bal = balRow?.balance ?? 0;
      if (bal < input.amount) throw new Error("Insufficient balance");
      const now = new Date().toISOString();
      db.prepare("INSERT INTO withdrawals (userId,asset,amount,address,status,createdAt) VALUES (?,?,?,?,?,?)")
        .run(ctx.user!.id, input.asset, input.amount, input.address, "pending", now);
      return { success: true };
    }),
});
