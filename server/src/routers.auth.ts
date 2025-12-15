import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

import { db } from "./db";
import { router, publicProcedure, authedProcedure } from "./trpc";
import { createSession, getSession, listUserSessions, revokeSession } from "./session";
import { sendEmail } from "./utils/mailer";

async function sendLoginAlertEmail(params: { to: string; ip?: string; ua?: string }) {
  await sendEmail({
    to: params.to,
    subject: "Login alert",
    text:
      `A login to your account occurred.\n` +
      `IP: ${params.ip ?? "unknown"}\n` +
      `Device: ${params.ua ?? "unknown"}\n` +
      `Time: ${new Date().toISOString()}\n`,
  });
}

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = db
        .prepare("SELECT id,email,password,role FROM users WHERE email=?")
        .get(input.email) as any;

      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const ok = await bcrypt.compare(input.password, user.password);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED" });

      const token = createSession(user.id);

      try {
        const ip =
          (ctx.req.headers["x-real-ip"] as string) ||
          (ctx.req.headers["x-forwarded-for"] as string) ||
          "";
        const ua = (ctx.req.headers["user-agent"] as string) || "";
        await sendLoginAlertEmail({ to: user.email, ip, ua });
      } catch {}

      return { token, user: { id: user.id, email: user.email, role: user.role } };
    }),

  sessionsList: authedProcedure.query(({ ctx }) => {
    return listUserSessions(ctx.user!.id);
  }),

  sessionsRevoke: authedProcedure
    .input(z.object({ token: z.string().min(10) }))
    .mutation(({ ctx, input }) => {
      const current = getSession(input.token);
      if (!current || current.id !== ctx.user!.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      revokeSession(input.token);
      return { success: true };
    }),
});
