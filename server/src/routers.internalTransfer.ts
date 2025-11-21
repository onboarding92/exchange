import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { listTransfersForUser } from "./internalTransfer";
import { TRPCError } from "@trpc/server";
import { logSecurity } from "./logger";
import {
  emailSchema,
  assetSymbolSchema,
  cryptoAmountSchema,
  optionalStringSchema,
} from "./validation";

export const internalTransferRouter = router({
  myTransfers: authedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(200).optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      const user = ctx.user!;
      const limit = input?.limit ?? 100;
      return listTransfersForUser(user.id, limit);
    }),

  createTransfer: authedProcedure
    .input(
      z.object({
        recipientEmail: emailSchema,
        asset: assetSymbolSchema,
        amount: cryptoAmountSchema,
        note: optionalStringSchema,
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date().toISOString();

      const recipientEmail = input.recipientEmail.trim().toLowerCase();
      const asset = input.asset.trim().toUpperCase();
      const amount = input.amount;
      const note = input.note ?? null;

      // Basic sanity checks (some already enforced by schemas)
      if (!recipientEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient email is required.",
        });
      }

      if (recipientEmail === user.email?.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot send funds to yourself.",
        });
      }

      // Look up recipient
      const recipient = db
        .prepare(
          "SELECT id, email FROM users WHERE lower(email) = lower(?)"
        )
        .get(recipientEmail) as
        | { id: number; email: string }
        | undefined;

      if (!recipient) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient not found.",
        });
      }

      if (recipient.id === user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot send funds to yourself.",
        });
      }

      // Check sender balance
      const walletRow = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        )
        .get(user.id, asset) as { balance: number } | undefined;

      const balance = walletRow?.balance ?? 0;
      if (balance < amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient ${asset} balance.`,
        });
      }

      try {
        const tx = (db as any).transaction(
          (
            fromUserId: number,
            toUserId: number,
            asset: string,
            amount: number,
            now: string,
            note: string | null
          ) => {
            // withdraw from sender
            db.prepare(
              "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
            ).run(amount, fromUserId, asset);

            // credit receiver
            const existing = db
              .prepare(
                "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
              )
              .get(toUserId, asset) as { balance: number } | undefined;

            if (existing) {
              db.prepare(
                "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
              ).run(amount, toUserId, asset);
            } else {
              db.prepare(
                "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
              ).run(toUserId, asset, amount);
            }

            // record transfer
            const res = db
              .prepare(
                `INSERT INTO internalTransfers
                  (fromUserId, toUserId, asset, amount, note, status, createdAt)
                 VALUES (?, ?, ?, ?, ?, 'completed', ?)`
              )
              .run(fromUserId, toUserId, asset, amount, note, now);

            return Number(res.lastInsertRowid);
          }
        );

        const transferId = tx(
          user.id,
          recipient.id,
          asset,
          amount,
          now,
          note
        );

        logSecurity("Internal transfer created", {
          transferId,
          fromUserId: user.id,
          toUserId: recipient.id,
          asset,
          amount,
        });

        return { success: true, transferId };
      } catch (err) {
        console.error("[internalTransfer] Failed to create transfer:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create internal transfer. Please try again later.",
        });
      }
    }),
});
