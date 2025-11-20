import { router, publicProcedure, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "./session";
import { sendEmail } from "./email";

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      const hash = await bcrypt.hash(input.password, 10);
      try {
        const res = db.prepare(
          "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
        ).run(input.email, hash, "user", "unverified", now, now);
        await sendEmail(input.email, "Welcome to BitChange", "Your account has been created successfully.");
        return { id: res.lastInsertRowid };
      } catch {
        throw new Error("User already exists");
      }
    }),
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const row = db.prepare("SELECT id,email,password,role FROM users WHERE email=?").get(input.email) as any;
      if (!row || !row.password) throw new Error("Invalid credentials");
      const ok = await bcrypt.compare(input.password, row.password);
      if (!ok) throw new Error("Invalid credentials");
      const token = createSession(row.id, row.email, row.role);
      ctx.res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
      return { user: { id: row.id, email: row.email, role: row.role } };
    }),
  me: publicProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),
  logout: authedProcedure.mutation(({ ctx }) => {
    const token = ctx.req.cookies?.session as string | undefined;
    destroySession(token);
    ctx.res.clearCookie("session");
    return { success: true };
  }),
});
