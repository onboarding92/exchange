import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { logActivity } from "./activityLog";

export const deviceRouter = router({
  /**
   * List current sessions for the logged in user.
   */
  list: protectedProcedure.query(({ ctx }) => {
    return db.prepare(
      `SELECT token, createdAt, ip, userAgent
       FROM sessions
       WHERE userId=?`
    ).all(ctx.user.id);
  }),

  /**
   * Revoke a specific session by token.
   */
  revoke: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => {
      db.prepare(
        "DELETE FROM sessions WHERE token=? AND userId=?"
      ).run(input.token, ctx.user.id);

      logActivity(ctx.user.id, "session_revoked");
      return { success: true };
    }),
});
