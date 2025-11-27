import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { createSession, destroySession } from "./session";

export const authRouter = router({

  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(({ input }) => {
      const user = db.prepare("SELECT * FROM users WHERE email=?").get(input.email);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return { token: createSession(user.id), user };
    }),

  submitKyc: protectedProcedure
    .input(
      z.object({
        frontUrl: z.string(),
        backUrl: z.string(),
        selfieUrl: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const last = db
        .prepare("SELECT MAX(createdAt) as ts FROM userKycDocuments WHERE userId=?")
        .get(ctx.user.id) as { ts?: string };

      if (last?.ts) {
        const diff = Date.now() - new Date(last.ts).getTime();
        if (diff < 10_000) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait before submitting again.",
          });
        }
      }

      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO userKycDocuments
          (userId, frontUrl, backUrl, selfieUrl, status, createdAt)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      ).run(ctx.user.id, input.frontUrl, input.backUrl, input.selfieUrl, now);

      db.prepare("UPDATE users SET kycStatus='pending' WHERE id=?").run(ctx.user.id);

      return { success: true };
    }),

});
