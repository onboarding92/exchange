import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";

export const transactionsRouter = router({
  history: authedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(10).max(100).default(25),
    }).optional())
    .query(({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 25;
      const offset = (page - 1) * pageSize;
      const rows = db.prepare(`
        SELECT 'deposit' as type, asset, amount, gateway as extra, status, createdAt
        FROM deposits WHERE userId=?
        UNION ALL
        SELECT 'withdrawal' as type, asset, amount, address as extra, status, createdAt
        FROM withdrawals WHERE userId=?
        UNION ALL
        SELECT 'trade' as type, pair as asset, qty as amount, side as extra, '' as status, createdAt
        FROM trades WHERE userId=?
        UNION ALL
        SELECT 'transfer' as type, asset, amount, (fromUserId || '->' || toUserId) as extra, '' as status, createdAt
        FROM internalTransfers WHERE fromUserId=? OR toUserId=?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `).all(ctx.user!.id, ctx.user!.id, ctx.user!.id, ctx.user!.id, ctx.user!.id, pageSize, offset);
      return rows;
    }),
});
