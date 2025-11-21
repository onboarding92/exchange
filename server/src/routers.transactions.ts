import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { listTransactionsForUser } from "./transactions";

export const transactionsRouter = router({
  historyForUser: authedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(500).optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      const user = ctx.user!;
      const limit = input?.limit ?? 200;
      const txs = listTransactionsForUser(user.id, limit);
      return txs;
    }),
});
