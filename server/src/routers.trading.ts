import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import { matchOrder, type OrderRow } from "./trading";

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
      const base = input.baseAsset.toUpperCase();
      const quote = input.quoteAsset.toUpperCase();

      // Determina quale asset usare per bloccare i fondi
      let assetToLock: string;
      let requiredAmount: number;

      if (input.side === "buy") {
        // Per un ordine BUY blocchiamo il quoteAsset (es. USDT) per price * amount
        assetToLock = quote;
        requiredAmount = input.amount * input.price;
      } else {
        // Per un ordine SELL blocchiamo il baseAsset (es. BTC) per amount
        assetToLock = base;
        requiredAmount = input.amount;
      }

      const wallet = db
        .prepare(
          "SELECT balance, locked, available FROM wallets WHERE userId=? AND asset=?"
        )
        .get(ctx.user!.id, assetToLock) as
        | { balance: number; locked?: number | null; available?: number | null }
        | undefined;

      const walletLocked = wallet?.locked ?? 0;
      const walletAvailable =
        wallet?.available != null
          ? wallet.available
          : (wallet?.balance ?? 0) - walletLocked;

      if (!wallet || walletAvailable < requiredAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient available balance to place order.",
        });
      }

      // Blocca i fondi necessari (locked aumenta, available diminuisce)
      db.prepare(
        `
        UPDATE wallets
        SET locked = locked + ?, available = available - ?
        WHERE userId=? AND asset=?
      `
      ).run(requiredAmount, requiredAmount, ctx.user!.id, assetToLock);

      // Inserisci l'ordine come "open"
      const insertResult = db.prepare(
        `
        INSERT INTO orders (
          userId, baseAsset, quoteAsset, side, type, status,
          price, amount, filledAmount, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, 'limit', 'open', ?, ?, 0, ?, NULL)
      `
      ).run(
        ctx.user!.id,
        base,
        quote,
        input.side,
        input.price,
        input.amount,
        now
      );

      const orderId = Number((insertResult as any).lastInsertRowid ?? 0);
      if (orderId) {
        matchOrder(orderId);
      }

      return { ok: true };
    }),

  // Cancel order
  cancelOrder: authedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();

      const order = db
        .prepare(
          `
          SELECT id, userId, baseAsset, quoteAsset, side, type, status,
                 price, amount, filledAmount
          FROM orders
          WHERE id = ?
        `
        )
        .get(input.id) as
        | {
            id: number;
            userId: number;
            baseAsset: string;
            quoteAsset: string;
            side: "buy" | "sell";
            type: "market" | "limit";
            status: string;
            price: number | null;
            amount: number;
            filledAmount: number;
          }
        | undefined;

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (order.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to cancel this order.",
        });
      }

      if (order.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only open orders can be cancelled.",
        });
      }

      // Quantità rimanente non ancora eseguita
      const remainingAmount = Math.max(
        0,
        order.amount - (order.filledAmount ?? 0)
      );

      let assetToUnlock: string | null = null;
      let unlockAmount = 0;

      if (order.side === "buy") {
        // BUY → fondi bloccati sul quoteAsset = remaining * price
        if (order.price == null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Limit BUY order without price.",
          });
        }
        assetToUnlock = order.quoteAsset;
        unlockAmount = remainingAmount * order.price;
      } else {
        // SELL → fondi bloccati sul baseAsset = remaining
        assetToUnlock = order.baseAsset;
        unlockAmount = remainingAmount;
      }

      if (assetToUnlock && unlockAmount > 0) {
        const wallet = db
          .prepare(
            "SELECT locked, available FROM wallets WHERE userId=? AND asset=?"
          )
          .get(order.userId, assetToUnlock) as
          | { locked?: number | null; available?: number | null }
          | undefined;

        const locked = wallet?.locked ?? 0;
        const actualUnlock = Math.min(unlockAmount, locked);

        if (actualUnlock > 0) {
          db.prepare(
            `
            UPDATE wallets
            SET locked = locked - ?, available = available + ?
            WHERE userId=? AND asset=?
          `
          ).run(actualUnlock, actualUnlock, order.userId, assetToUnlock);
        }
      }

      db.prepare(
        `
        UPDATE orders
        SET status = 'cancelled', updatedAt = ?
        WHERE id = ?
      `
      ).run(now, order.id);

      return { ok: true };
    }),

  // Order book: costruito dagli ordini 'open' di tipo 'limit'
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

      const rows = db
        .prepare(
          `
          SELECT side, price, amount, filledAmount
          FROM orders
          WHERE baseAsset = ?
            AND quoteAsset = ?
            AND type = 'limit'
            AND status = 'open'
        `
        )
        .all(base, quote) as {
          side: "buy" | "sell";
          price: number | null;
          amount: number;
          filledAmount: number;
        }[];

      const bidsMap = new Map<number, number>(); // price -> total amount
      const asksMap = new Map<number, number>();

      for (const row of rows) {
        if (row.price == null) continue;
        const remaining = Math.max(0, row.amount - (row.filledAmount ?? 0));
        if (remaining <= 0) continue;

        if (row.side === "buy") {
          const prev = bidsMap.get(row.price) ?? 0;
          bidsMap.set(row.price, prev + remaining);
        } else {
          const prev = asksMap.get(row.price) ?? 0;
          asksMap.set(row.price, prev + remaining);
        }
      }

      const bids = Array.from(bidsMap.entries())
        .map(([price, amount]) => ({ price, amount }))
        .sort((a, b) => b.price - a.price); // BIDS: prezzo decrescente

      const asks = Array.from(asksMap.entries())
        .map(([price, amount]) => ({ price, amount }))
        .sort((a, b) => a.price - b.price); // ASKS: prezzo crescente

      return {
        baseAsset: base,
        quoteAsset: quote,
        bids,
        asks,
      };
    }),
});
