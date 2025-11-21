import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { listTransfersForUser } from "./internalTransfer";
import { TRPCError } from "@trpc/server";
import { logSecurity } from "./logger";

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
        recipientEmail: z.string().email(),
        asset: z.string().min(1).max(16),
        amount: z.number().positive().max(1_000_000_000),
        note: z.string().max(255).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date().toISOString();

      const recipient = db
        .prepare(
          "SELECT id, email FROM users WHERE lower(email) = lower(?)"
        )
        .get(input.recipientEmail.trim()) as
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

      const asset = input.asset.toUpperCase();

      const walletRow = db
        .prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        )
        .get(user.id, asset) as { balance: number } | undefined;

      const balance = walletRow?.balance ?? 0;
      if (balance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient ${asset} balance.`,
        });
      }

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
        input.amount,
        now,
        input.note?.trim() || null
      );

      logSecurity("Internal transfer created", {
        transferId,
        fromUserId: user.id,
        toUserId: recipient.id,
        asset,
        amount: input.amount,
      });

      return { success: true, transferId };
    }),
});
