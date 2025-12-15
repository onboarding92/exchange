import { router, adminProcedure, authedProcedure } from "./trpc";
import { db } from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

function assertPendingWithdrawal(id: number) {
  const row = db
    .prepare("SELECT status FROM withdrawals WHERE id=?")
    .get(id) as { status?: string } | undefined;

  if (!row) {
    throw new Error("Withdrawal not found");
  }
  if (row.status !== "pending") {
    throw new Error("Withdrawal is not pending anymore");
  }
}

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
});
