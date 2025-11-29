import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { logActivity } from "./activityLog";

export const loginRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(input.email);

      if (!user) throw new Error("Invalid credentials");

      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new Error("Invalid credentials");

      const token = randomUUID();
      const now = new Date().toISOString();

      const ip =
        (ctx as any).req?.headers?.["x-forwarded-for"] ||
        (ctx as any).req?.socket?.remoteAddress ||
        "unknown";

      const agent =
        (ctx as any).req?.headers?.["user-agent"] || "unknown";

      db.prepare(
        `INSERT INTO sessions (token, userId, email, role, ip, userAgent, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(token, user.id, user.email, user.role, ip, agent, now);

      logActivity(user.id, "login", ip);

      return {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      };
    }),
});
