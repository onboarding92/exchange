import { router, authedProcedure, adminProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { sendEmail } from "./email";

export const supportRouter = router({
  createTicket: authedProcedure
    .input(z.object({
      subject: z.string().min(3),
      message: z.string().min(3),
    }))
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO tickets (userId,subject,message,status,createdAt) VALUES (?,?,?,?,?)")
        .run(ctx.user!.id, input.subject, input.message, "open", now);
      if (ctx.user?.email) {
        void sendEmail(ctx.user.email, "Support ticket opened", `We have received your ticket: ${input.subject}`);
      }
      return { success: true };
    }),
  myTickets: authedProcedure.query(({ ctx }) => {
    return db.prepare("SELECT * FROM tickets WHERE userId=? ORDER BY createdAt DESC").all(ctx.user!.id);
  }),
  adminList: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM tickets ORDER BY createdAt DESC").all();
  }),
  adminUpdateStatus: adminProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["open","closed","pending"]) }))
    .mutation(({ input }) => {
      db.prepare("UPDATE tickets SET status=? WHERE id=?").run(input.status, input.id);
      return { success: true };
    }),
});
