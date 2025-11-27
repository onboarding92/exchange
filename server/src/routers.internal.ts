import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import { listInternalTransfersForUser } from "./internalTransfers";
import { logSecurity, logWarn } from "./logger";

const assetSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");

export const internalRouter = router({
  // Create an internal transfer from the current user to another user by email
  createTransfer: authedProcedure
    .input(
      z.object({
        recipientEmail: z.string().email(),
        asset: assetSchema,
        amount: z.number().positive().max(1_000_000_000),
        memo: z.string().max(500).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const senderId = user.id;

      const recipient = db
        .prepare(`SELECT id, email FROM users WHERE email = ?")
        .get(input.recipientEmail) as { id: number; email: string } | undefined;

      if (!recipient) {
        logWarn("Internal transfer failed: recipient not found", {
          fromUserId: senderId,
          recipientEmail: input.recipientEmail,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient not found.",
        });
      }

      if (recipient.id === senderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot send funds to yourself.",
        });
      }

      // Check sender balance
      const wallet = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        )
        .get(senderId, input.asset) as { balance: number } | undefined;

      if (!wallet || wallet.balance < input.amount) {
        logWarn("Internal transfer failed: insufficient balance", {
          fromUserId: senderId,
          toUserId: recipient.id,
          asset: input.asset,
          requestedAmount: input.amount,
          balance: wallet?.balance ?? 0,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient balance.",
        });
      }

      const now = new Date().toISOString();

      // Use a transaction to update both wallets and insert transfer atomically
      const tx = (db as any).transaction(
        (fromId: number, toId: number, asset: string, amount: number, memo: string | null) => {
          // Decrease sender balance
          db.prepare(
            "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
          ).run(amount, fromId, asset);

          // Increase recipient balance (create wallet row if none)
          const existingRecipientWallet = db
            .prepare(
              "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
            )
            .get(toId, asset) as { balance: number } | undefined;

          if (existingRecipientWallet) {
            db.prepare(
              "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
            ).run(amount, toId, asset);
          } else {
            db.prepare(
              "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
            ).run(toId, asset, amount);
          }

          db.prepare(
            `INSERT INTO internalTransfers (fromUserId, toUserId, asset, amount, memo, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(fromId, toId, asset, amount, memo, now);
        }
      );

      tx(senderId, recipient.id, input.asset, input.amount, input.memo ?? null);

      logSecurity("Internal transfer completed", {
        fromUserId: senderId,
        toUserId: recipient.id,
        asset: input.asset,
        amount: input.amount,
      });

      return { success: true };
    }),

  // List internal transfers involving the current user
  historyForUser: authedProcedure.query(({ ctx }) => {
    const user = ctx.user!;
    const rows = listInternalTransfersForUser(user.id);
    return rows;
  }),
});
