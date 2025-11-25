import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import type { OrderRow } from "./trading";
import "./trading"; // assicura che ensureTradingSchema venga eseguito

export const tradingRouter = router({
  // Lista ultimi ordini dell'utente (per ora senza filtri complessi)
  myOrders: authedProcedure.query(({ ctx }) => {
    const rows = db
      .prepare(
        `
        SELECT id, userId, baseAsset, quoteAsset, side, type, status,
               price, amount, filledAmount, createdAt, updatedAt
        FROM orders
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT 100
      `
      )
      .all(ctx.user!.id) as OrderRow[];

    return rows;
  }),

  // Place limit order (scheletro: inserisce l'ordine, ma NON fa ancora matching)
  placeLimitOrder: authedProcedure
    .input(
      z.object({
        baseAsset: z.string().min(2).max(10),
        quoteAsset: z.string().min(2).max(10),
        side: z.enum(["buy", "sell"]),
        price: z.number().positive(),
        amount: z.number().positive(),
      })
    )
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();

      // TODO: nei prossimi step:
      // - usare available/locked per bloccare i fondi necessari
      // - aggiungere matching engine
      db.prepare(
        `
        INSERT INTO orders (
          userId, baseAsset, quoteAsset, side, type, status,
          price, amount, filledAmount, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, 'limit', 'open', ?, ?, 0, ?, NULL)
      `
      ).run(
        ctx.user!.id,
        input.baseAsset.toUpperCase(),
        input.quoteAsset.toUpperCase(),
        input.side,
        input.price,
        input.amount,
        now
      );

      return { ok: true };
    }),

  // Cancel order (scheletro: per ora solo placeholder)
  cancelOrder: authedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation((_opts) => {
      // TODO: implementare verifica owner + update status + sblocco fondi
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Cancel order non è ancora implementato.",
      });
    }),

  // Order book (scheletro: ritorna solo struttura vuota)
  orderBook: publicProcedure
    .input(
      z.object({
        baseAsset: z.string().min(2).max(10),
        quoteAsset: z.string().min(2).max(10),
      })
    )
    .query(({ input }) => {
      const base = input.baseAsset.toUpperCase();
      const quote = input.quoteAsset.toUpperCase();

      // TODO: nei prossimi step:
      // - costruire book da ordini 'open'
      // - separare bids/asks, ordinare per prezzo
      return {
        baseAsset: base,
        quoteAsset: quote,
        bids: [] as { price: number; amount: number }[],
        asks: [] as { price: number; amount: number }[],
      };
    }),
});
