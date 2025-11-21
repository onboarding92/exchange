import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { listLoginHistoryForUser } from "./loginHistory";

export const loginHistoryRouter = router({
  historyForUser: authedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(200).optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      const user = ctx.user!;
      const limit = input?.limit ?? 50;
      const rows = listLoginHistoryForUser(user.id, limit);
      return rows;
    }),
});
