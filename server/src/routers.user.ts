import { t, protectedProcedure } from './trpc.js';
import { db } from './db.js';
export const userRouter = t.router({

  // DEVICE + SESSION MANAGEMENT
  listSessions: protectedProcedure.query(({ ctx }) => {
    return db.prepare("SELECT token, createdAt FROM sessions WHERE userId=?")
      .all(ctx.user.id);
  }),

  revokeSession: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => {
      db.prepare("DELETE FROM sessions WHERE token=? AND userId=?")
        .run(input.token, ctx.user.id);
      return { ok: true };
    }),
});