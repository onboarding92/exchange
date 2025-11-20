import { router, adminProcedure } from "./trpc";
import { db } from "./db";
import { sendEmail } from "./email";

export const adminRouter = router({
  stats: adminProcedure.query(() => {
    const users = db.prepare("SELECT COUNT(*) as c FROM users").get() as any;
    const deposits = db.prepare("SELECT COUNT(*) as c FROM deposits").get() as any;
    const withdrawals = db.prepare("SELECT COUNT(*) as c FROM withdrawals").get() as any;
    const trades = db.prepare("SELECT COUNT(*) as c FROM trades").get() as any;
    return {
      users: users.c,
      deposits: deposits.c,
      withdrawals: withdrawals.c,
      trades: trades.c,
    };
  }),
  users: adminProcedure.query(() => {
    return db.prepare("SELECT id,email,role,kycStatus,createdAt FROM users ORDER BY createdAt DESC").all();
  }),
  withdrawals: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM withdrawals ORDER BY createdAt DESC").all();
  }),
  approveWithdrawal: adminProcedure
    .input(require("zod").z.object({
      id: require("zod").z.number().int(),
      approve: require("zod").z.boolean(),
    }))
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      const status = input.approve ? "approved" : "rejected";
      const wd = db.prepare("SELECT * FROM withdrawals WHERE id=?").get(input.id) as any;
      db.prepare("UPDATE withdrawals SET status=?, reviewedBy=?, reviewedAt=? WHERE id=?")
        .run(status, ctx.user!.id, now, input.id);
      if (wd?.userId) {
        const u = db.prepare("SELECT email FROM users WHERE id=?").get(wd.userId) as any;
        if (u?.email) {
          const subj = status === "approved" ? "Withdrawal approved" : "Withdrawal rejected";
          const body = status === "approved"
            ? `Your withdrawal of ${wd.amount} ${wd.asset} has been approved.`
            : `Your withdrawal of ${wd.amount} ${wd.asset} has been rejected.`;
          void sendEmail(u.email, subj, body);
        }
      }
      return { success: true };
    }),
  coins: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM coins ORDER BY asset ASC").all();
  }),
  updateCoin: adminProcedure
    .input(require("zod").z.object({
      id: require("zod").z.number().int(),
      enabled: require("zod").z.boolean(),
      minWithdraw: require("zod").z.number(),
      withdrawFee: require("zod").z.number(),
    }))
    .mutation(({ input }) => {
      db.prepare("UPDATE coins SET enabled=?, minWithdraw=?, withdrawFee=? WHERE id=?")
        .run(input.enabled ? 1 : 0, input.minWithdraw, input.withdrawFee, input.id);
      return { success: true };
    }),
  logs: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM logs ORDER BY createdAt DESC LIMIT 200").all();
  }),
  profit: adminProcedure.query(() => {
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c as number;
    const totalDeposited = db.prepare("SELECT SUM(amount) as s FROM deposits WHERE status='completed'").get().s || 0;
    const totalWithdrawn = db.prepare("SELECT SUM(amount) as s FROM withdrawals WHERE status='approved'").get().s || 0;
    return {
      totalUsers,
      totalDeposited,
      totalWithdrawn,
      profitEstimate: (totalDeposited - totalWithdrawn) * 0.01,
    };
  }),
});
