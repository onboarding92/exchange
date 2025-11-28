
// ============================
// DEVICE & SESSION MANAGEMENT
// ============================

import { protectedProcedure, router } from "../trpc";
import { z } from "zod";
import { db } from "../db";

// List active sessions for user
export const sessionRouter = router({
  listDevices: protectedProcedure.query(({ ctx }) => {
    return db.prepare(
      "SELECT token, createdAt, userAgent, ip FROM sessions WHERE userId=? ORDER BY createdAt DESC"
    ).all(ctx.user.id);
  }),

  revokeOne: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => {
      db.prepare("DELETE FROM sessions WHERE userId=? AND token=?")
        .run(ctx.user.id, input.token);
      return { ok: true };
    }),

  revokeAllExceptCurrent: protectedProcedure.mutation(({ ctx }) => {
    db.prepare("DELETE FROM sessions WHERE userId=? AND token!=?")
      .run(ctx.user.id, ctx.sessionToken);
    return { ok: true };
  }),
});
