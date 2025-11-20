import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { sendEmail } from "./email";

export const internalRouter = router({
  transfer: authedProcedure
    .input(z.object({
      toEmail: z.string().email(),
      asset: z.string(),
      amount: z.number().positive(),
    }))
    .mutation(({ ctx, input }) => {
      const toUser = db.prepare("SELECT id FROM users WHERE email=?").get(input.toEmail) as any;
      if (!toUser) throw new Error("Recipient not found");
      if (toUser.id === ctx.user!.id) throw new Error("Cannot transfer to self");
      const balRow = db.prepare("SELECT balance FROM wallets WHERE userId=? AND asset=?")
        .get(ctx.user!.id, input.asset) as any;
      const bal = balRow?.balance ?? 0;
      if (bal < input.amount) throw new Error("Insufficient balance");
      const now = new Date().toISOString();
      db.prepare("UPDATE wallets SET balance=balance-? WHERE userId=? AND asset=?")
        .run(input.amount, ctx.user!.id, input.asset);
      db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)")
        .run(toUser.id, input.asset, 0);
      db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?")
        .run(input.amount, toUser.id, input.asset);
      db.prepare("INSERT INTO internalTransfers (fromUserId,toUserId,asset,amount,createdAt) VALUES (?,?,?,?,?)")
        .run(ctx.user!.id, toUser.id, input.asset, input.amount, now);
      // notify both parties if emails exist
      if (ctx.user?.email) {
        void sendEmail(ctx.user.email, "Internal transfer sent", `You sent ${input.amount} ${input.asset} to ${input.toEmail}.`);
      }
      const recipient = db.prepare("SELECT email FROM users WHERE id=?").get(toUser.id) as any;
      if (recipient?.email) {
        void sendEmail(recipient.email, "Internal transfer received", `You received ${input.amount} ${input.asset} from ${ctx.user?.email ?? "another user"}.`);
      }
      return { success: true };
    }),
});
