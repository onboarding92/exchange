import { adminProcedure, authedProcedure, router } from "./trpc";
import { db } from "./db";
import {
  sendKycStatusEmail,
  sendWithdrawalStatusEmail,
} from "./email";
import { adminListDeposits } from "./adminDeposits";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./activity";
import { extractClientIp } from "./rateLimit";

export const adminRouter = router({

// ===========================
// Admin — Force Password Reset
// ===========================
forcePasswordChange: adminProcedure
  .input(z.object({ userId: z.number() }))
  .mutation(({ input }) => {
    db.prepare("UPDATE users SET forcePasswordChange=1 WHERE id=?")
      .run(input.userId);
    return { ok: true };
  }),

  // ========================
  // KYC status update
  // ========================
  updateKycStatus: authedProcedure
    .input(
      z.object({
        kycId: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        reason: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const admin = ctx.user;
      if (!admin || (admin as any).role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin privileges required.",
        });
      }

      const now = new Date().toISOString();

      const existing = db
        .prepare(
          `SELECT id, userId, status, rejectionReason
           FROM kycRequests
           WHERE id = ?`
        )
        .get(input.kycId) as
        | {
            id: number;
            userId: number;
            status: string;
            rejectionReason: string | null;
          }
        | undefined;

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KYC request not found.",
        });
      }

      db.prepare(
        `UPDATE kycRequests
         SET status = ?, rejectionReason = ?, reviewedAt = ?, reviewerId = ?
         WHERE id = ?`
      ).run(
        input.status,
        input.status === "rejected" ? input.reason ?? null : null,
        now,
        admin.id,
        input.kycId
      );

      const request = db
        .prepare(
          `SELECT kr.id,
                  kr.userId,
                  kr.status,
                  kr.rejectionReason,
                  u.email
           FROM kycRequests kr
           JOIN users u ON u.id = kr.userId
           WHERE kr.id = ?`
        )
        .get(input.kycId) as
        | {
            id: number;
            userId: number;
            status: string;
            rejectionReason: string | null;
            email: string;
          }
        | undefined;

      if (request && request.email) {
        void sendKycStatusEmail({
          to: request.email,
          status: input.status === "approved" ? "approved" : "rejected",
          reason: input.reason ?? request.rejectionReason ?? null,
        });

        const req = ctx.req as any;
        const ip = extractClientIp(req);
        const userAgent = req?.headers?.["user-agent"] ?? null;

        try {
          logActivity({
            userId: request.userId,
            type: "kyc_status_update",
            category: "security",
            description:
              input.status === "approved"
                ? "KYC approved by admin"
                : "KYC rejected by admin",
            metadata: {
              kycId: request.id,
              status: input.status,
              reason:
                input.reason ?? request.rejectionReason ?? null,
              adminId: admin.id,
            },
            ip,
            userAgent,
          });
        } catch (err) {
          console.error(
            "[activity] Failed to log KYC status update:",
            err
          );
        }
      }

      return { success: true };
    }),

  // ========================
  // Deposits list (admin)
  // ========================
  listDeposits: authedProcedure
    .input(
      z
        .object({
          status: z.string().max(50).optional(),
          provider: z.string().max(50).optional(),
          limit: z.number().int().positive().max(500).optional(),
          offset: z.number().int().nonnegative().optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return adminListDeposits({
        status: input?.status,
        provider: input?.provider,
        limit: input?.limit,
        offset: input?.offset,
      });
    }),

  // ========================
  // Stats dashboard
  // ========================
  stats: adminProcedure.query(() => {
    const users = db
      .prepare(`SELECT COUNT(*) as c FROM users")
      .get() as any;
    const deposits = db
      .prepare(`SELECT COUNT(*) as c FROM deposits")
      .get() as any;
    const withdrawals = db
      .prepare(`SELECT COUNT(*) as c FROM withdrawals")
      .get() as any;
    const trades = db
      .prepare(`SELECT COUNT(*) as c FROM trades")
      .get() as any;

    return {
      users: users.c,
      deposits: deposits.c,
      withdrawals: withdrawals.c,
      trades: trades.c,
    };
  }),

  // ========================
  // Users table
  // ========================
  users: adminProcedure.query(() => {
    return db
      .prepare(
        "SELECT id,email,role,kycStatus,createdAt FROM users ORDER BY createdAt DESC"
      )
      .all();
  }),

  // ========================
  // Withdrawals (list)
  // ========================
  withdrawals: adminProcedure.query(() => {
    return db
      .prepare(`SELECT * FROM withdrawals ORDER BY createdAt DESC")
      .all();
  }),

  // ========================
  // Approve / reject withdrawal
  // ========================
  approveWithdrawal: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        approve: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      const status = input.approve ? "approved" : "rejected";

      const wd = db
        .prepare(`SELECT * FROM withdrawals WHERE status='pending' AND id=?")
        .get(input.id) as any;

      if (!wd) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Withdrawal not found.",
        });
      }

      // Calcola fee corrente e totale da addebitare/sbloccare
      const coinRow = db
        .prepare(`SELECT withdrawFee FROM coins WHERE asset=?")
        .get(wd.asset) as { withdrawFee: number } | undefined;
      const fee = coinRow?.withdrawFee ?? 0;
      const totalAmount = wd.amount + fee;

      if (input.approve) {
        // Approvazione: i fondi locked vengono prelevati dal balance
        const wallet = db
          .prepare(
            "SELECT balance, locked, available FROM wallets WHERE userId=? AND asset=?"
          )
          .get(wd.userId, wd.asset) as
          | { balance: number; locked?: number | null; available?: number | null }
          | undefined;

        const walletLocked = wallet?.locked ?? 0;

        if (!wallet || wallet.balance < totalAmount) {
          logWarn("Admin approveWithdrawal failed: insufficient wallet balance", {
            adminId: ctx.user!.id,
            userId: wd.userId,
            asset: wd.asset,
            totalAmount,
            balance: wallet?.balance ?? 0,
            locked: walletLocked,
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient wallet balance to approve withdrawal.",
          });
        }

        if (walletLocked >= totalAmount) {
          // Nuovo flusso: usiamo i fondi locked
          db.prepare(
            `
            UPDATE wallets
            SET balance = balance - ?, locked = locked - ?
            WHERE userId=? AND asset=?
          `
          ).run(totalAmount, totalAmount, wd.userId, wd.asset);
        } else {
          // Fallback legacy: non c'erano fondi locked, scala solo da balance
          db.prepare(
            `
            UPDATE wallets
            SET balance = balance - ?
            WHERE userId=? AND asset=?
          `
          ).run(totalAmount, wd.userId, wd.asset);
        }
      } else {
        // Rejected: se ci sono fondi locked, sbloccali (tornano available)
        const wallet = db
          .prepare(
            "SELECT locked, available FROM wallets WHERE userId=? AND asset=?"
          )
          .get(wd.userId, wd.asset) as
          | { locked?: number | null; available?: number | null }
          | undefined;

        const walletLocked = wallet?.locked ?? 0;
        if (wallet && walletLocked > 0) {
          db.prepare(
            `
            UPDATE wallets
            SET locked = CASE
                  WHEN locked > ? THEN locked - ?
                  ELSE 0
                END,
                available = available + ?
            WHERE userId=? AND asset=?
          `
          ).run(totalAmount, totalAmount, totalAmount, wd.userId, wd.asset);
        }
      }

      db.prepare(
        "UPDATE withdrawals SET status=?, reviewedBy=?, reviewedAt=? WHERE id=?"
      ).run(status, ctx.user!.id, now, input.id);

      // email utente
      if (wd.userId) {
        const u = db
          .prepare(`SELECT email FROM users WHERE id=?")
          .get(wd.userId) as any;

        if (u?.email) {
          void sendWithdrawalStatusEmail({
            to: u.email,
            asset: wd.asset,
            amount: wd.amount,
            status: status as "approved" | "rejected" | "pending",
            txId: null,
            reason: undefined,
          });
        }
      }

      // activity log
      const req = ctx.req as any;
      const ip = extractClientIp(req);
      const userAgent = req?.headers?.["user-agent"] ?? null;

      try {
        logActivity({
          userId: wd.userId ?? null,
          type: "withdrawal_status_update",
          category: "wallet",
          description: `Withdrawal ${status} by admin`,
          metadata: {
            withdrawalId: wd.id,
            asset: wd.asset,
            amount: wd.amount,
            status,
            adminId: ctx.user!.id,
          },
          ip,
          userAgent,
        });
      } catch (err) {
        console.error(
          "[activity] Failed to log withdrawal status update:",
          err
        );
      }

      return { success: true };
    }),

  // ========================
  // Coins management
  // ========================
  coins: adminProcedure.query(() => {
    return db
      .prepare(`SELECT * FROM coins ORDER BY asset ASC")
      .all();
  }),

  updateCoin: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        enabled: z.boolean(),
        minWithdraw: z.number(),
        withdrawFee: z.number(),
      })
    )
    .mutation(({ input }) => {
      db.prepare(
        "UPDATE coins SET enabled=?, minWithdraw=?, withdrawFee=? WHERE id=?"
      ).run(
        input.enabled ? 1 : 0,
        input.minWithdraw,
        input.withdrawFee,
        input.id
      );
      return { success: true };
    }),

  // ========================
  // Logs
  // ========================
  logs: adminProcedure.query(() => {
    return db
      .prepare(
        "SELECT * FROM logs ORDER BY createdAt DESC LIMIT 200"
      )
      .all();
  }),

  // ========================
  // Profit (very simple)
  // ========================
  profit: adminProcedure.query(() => {
    const totalUsers =
      (db
        .prepare(`SELECT COUNT(*) as c FROM users")
        .get() as any).c ?? 0;
    const totalDeposited =
      (db
        .prepare(
          "SELECT SUM(amount) as s FROM deposits WHERE status='completed'"
        )
        .get() as any).s || 0;
    const totalWithdrawn =
      (db
        .prepare(
          "SELECT SUM(amount) as s FROM withdrawals WHERE status='pending' AND status='approved'"
        )
        .get() as any).s || 0;

    return {
      totalUsers,
      totalDeposited,
      totalWithdrawn,
      profitEstimate: (totalDeposited - totalWithdrawn) * 0.01,
    };
  }),
});
