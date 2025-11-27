import { router, authedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { TRPCError } from "@trpc/server";
import {
  listTicketsForUser,
  listTicketsAdmin,
  getTicketWithMessages,
} from "./support";
import { logSecurity, logWarn } from "./logger";
import { sendSupportReplyEmail } from "./email";

const subjectSchema = z.string().min(5).max(200);
const messageSchema = z.string().min(5).max(5000);

export const supportRouter = router({
  // User: create a new ticket
  createTicket: authedProcedure
    .input(
      z.object({
        subject: subjectSchema,
        category: z.string().max(100).optional(),
        message: messageSchema,
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date().toISOString();

      const tx = (db as any).transaction(
        (
          userId: number,
          subject: string,
          category: string | null,
          message: string,
          now: string
        ) => {
          const res = db
            .prepare(
              `INSERT INTO supportTickets
                (userId, subject, category, status, priority, createdAt, updatedAt, lastMessageAt, lastMessageBy)
               VALUES (?, ?, ?, 'open', 'normal', ?, ?, ?, 'user')`
            )
            .run(userId, subject, category, now, now, now);

          const ticketId = Number(res.lastInsertRowid);

          db.prepare(
            `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'user', ?, ?)`
          ).run(ticketId, userId, message, now);

          return ticketId;
        }
      );

      const ticketId = tx(
        user.id,
        input.subject,
        input.category ?? null,
        input.message,
        now
      );

      logSecurity("Support ticket created", {
        userId: user.id,
        email: user.email,
        ticketId,
      });

      return { success: true, ticketId };
    }),

  // User: list own tickets
  myTickets: authedProcedure.query(({ ctx }) => {
    const user = ctx.user!;
    return listTicketsForUser(user.id);
  }),

  // User: get a ticket with messages (only if owner)
  getTicket: authedProcedure
    .input(
      z.object({
        ticketId: z.number().int().positive(),
      })
    )
    .query(({ ctx, input }) => {
      const user = ctx.user!;
      const data = getTicketWithMessages(input.ticketId);
      if (!data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
      }
      if (data.ticket.userId !== user.id && user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
      return data;
    }),

  // User: reply to own ticket
  replyTicket: authedProcedure
    .input(
      z.object({
        ticketId: z.number().int().positive(),
        message: messageSchema,
      })
    )
    .mutation(({ ctx, input }) => {
      const user = ctx.user!;
      const now = new Date().toISOString();

      const ticket = db
        .prepare(
          `SELECT id, userId, status
           FROM supportTickets
           WHERE id = ?`
        )
        .get(input.ticketId) as { id: number; userId: number; status: string } | undefined;

      if (!ticket || ticket.userId !== user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
      }

      if (ticket.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This ticket is closed.",
        });
      }

      const tx = (db as any).transaction(
        (ticketId: number, userId: number, message: string, now: string) => {
          db.prepare(
            `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'user', ?, ?)`
          ).run(ticketId, userId, message, now);

          db.prepare(
            `UPDATE supportTickets
             SET updatedAt = ?, lastMessageAt = ?, lastMessageBy = 'user'
             WHERE id = ?`
          ).run(now, now, ticketId);
        }
      );

      tx(ticket.id, user.id, input.message, now);

      logSecurity("Support ticket user reply", {
        userId: user.id,
        ticketId: ticket.id,
      });

      return { success: true };
    }),

  // Admin: list tickets
  listTickets: authedProcedure
    .input(
      z
        .object({
          status: z.string().max(50).optional(),
          category: z.string().max(100).optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return listTicketsAdmin(input?.status, input?.category ?? undefined, 500);
    }),

  // Admin: reply to ticket
  adminReply: authedProcedure
    .input(
      z.object({
        ticketId: z.number().int().positive(),
        message: messageSchema,
        newStatus: z.enum(["open", "pending", "closed"]).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const admin = ctx.user;

      const ticket = db
        .prepare(
          `SELECT id, userId, status
           FROM supportTickets
           WHERE id = ?`
        )
        .get(input.ticketId) as { id: number; userId: number; status: string } | undefined;

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
      }

      const now = new Date().toISOString();
      const newStatus = input.newStatus ?? ticket.status;

      const tx = (db as any).transaction(
        (ticketId: number, adminId: number, message: string, now: string, status: string) => {
          db.prepare(
            `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'admin', ?, ?)`
          ).run(ticketId, adminId, message, now);

          db.prepare(
            `UPDATE supportTickets
             SET status = ?, updatedAt = ?, lastMessageAt = ?, lastMessageBy = 'admin'
             WHERE id = ?`
          ).run(status, now, now, ticketId);
        }
      );

      tx(ticket.id, admin.id, input.message, now, newStatus);

      logSecurity("Support ticket admin reply", {
        adminId: admin.id,
        ticketId: ticket.id,
        newStatus,
      });

      
      // Try to email the user (if SMTP configured)
      try {
        const userRow = db
          .prepare(`SELECT email FROM users WHERE id = ?")
          .get(ticket.userId) as { email?: string } | undefined;

        if (userRow?.email) {
          const snippet =
            input.message.length > 200
              ? input.message.slice(0, 200) + "..."
              : input.message;

          void sendSupportReplyEmail({
            to: userRow.email,
            ticketId: ticket.id,
            subject: ticket.id.toString(),
            replySnippet: snippet,
          });
        }
      } catch (err) {
        console.error("[email] Failed to schedule support reply email:", err);
      }

return { success: true };
    }),

  // Admin: update ticket status without message
  adminUpdateStatus: authedProcedure
    .input(
      z.object({
        ticketId: z.number().int().positive(),
        status: z.enum(["open", "pending", "closed"]),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE supportTickets
         SET status = ?, updatedAt = ?
         WHERE id = ?`
      ).run(input.status, now, input.ticketId);

      logSecurity("Support ticket status updated", {
        adminId: ctx.user.id,
        ticketId: input.ticketId,
        status: input.status,
      });

      return { success: true };
    }),
});