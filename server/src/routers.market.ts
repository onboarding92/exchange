import { router, publicProcedure, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";

export const marketRouter = router({
  prices: publicProcedure.query(() => {
    return db.prepare("SELECT asset,price,updatedAt FROM prices").all();
  }),
  placeOrder: authedProcedure
    .input(z.object({
      pair: z.string(),
      side: z.enum(["buy","sell"]),
      price: z.number().positive(),
      qty: z.number().positive(),
    }))
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO trades (userId,pair,side,price,qty,createdAt) VALUES (?,?,?,?,?,?)")
        .run(ctx.user!.id, input.pair, input.side, input.price, input.qty, now);
      const [base, quote] = input.pair.split("/");
      if (input.side === "buy") {
        const cost = input.price * input.qty;
        db.prepare("UPDATE wallets SET balance=balance-? WHERE userId=? AND asset=?")
          .run(cost, ctx.user!.id, quote);
        db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)")
          .run(ctx.user!.id, base, 0);
        db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?")
          .run(input.qty, ctx.user!.id, base);
      } else {
        db.prepare("UPDATE wallets SET balance=balance-? WHERE userId=? AND asset=?")
          .run(input.qty, ctx.user!.id, base);
        const revenue = input.price * input.qty;
        db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)")
          .run(ctx.user!.id, quote, 0);
        db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?")
          .run(revenue, ctx.user!.id, quote);
      }
      return { success: true };
    }),
});
