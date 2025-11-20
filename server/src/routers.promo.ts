import { router, authedProcedure, adminProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { sendEmail } from "./email";

export const promoRouter = router({
  redeem: authedProcedure
    .input(z.object({ code: z.string().min(3).max(64) }))
    .mutation(({ ctx, input }) => {
      const promo = db.prepare("SELECT * FROM promoCodes WHERE code=?").get(input.code) as any;
      if (!promo) throw new Error("Invalid promo code");
      if (promo.expiresAt && promo.expiresAt < new Date().toISOString()) {
        throw new Error("Promo code expired");
      }
      const userUsed = db.prepare(
        "SELECT COUNT(*) as c FROM promoRedemptions WHERE promoCodeId=? AND userId=?"
      ).get(promo.id, ctx.user!.id) as any;
      if (promo.type === "first_deposit" && userUsed.c > 0) {
        throw new Error("Promo already used");
      }
      const totalUsed = db.prepare(
        "SELECT COUNT(*) as c FROM promoRedemptions WHERE promoCodeId=?"
      ).get(promo.id) as any;
      if (totalUsed.c >= promo.maxRedemptions) {
        throw new Error("Promo fully redeemed");
      }
      const bonusAmount = promo.rewardValue as number;
      const now = new Date().toISOString();
      db.prepare("INSERT INTO promoRedemptions (userId,promoCodeId,redeemedAt,bonusAmount) VALUES (?,?,?,?)")
        .run(ctx.user!.id, promo.id, now, bonusAmount);
      db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)")
        .run(ctx.user!.id, "USDT", 0);
      db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?")
        .run(bonusAmount, ctx.user!.id, "USDT");
      if (ctx.user?.email) {
        void sendEmail(ctx.user.email, "Promo code redeemed", `You received a bonus of ${bonusAmount} USDT from promo code ${promo.code}.`);
      }
      return { success: true, bonusAmount };
    }),
  myRedemptions: authedProcedure.query(({ ctx }) => {
    return db.prepare(`
      SELECT pr.id, pc.code, pc.type, pr.bonusAmount, pr.redeemedAt
      FROM promoRedemptions pr
      JOIN promoCodes pc ON pc.id = pr.promoCodeId
      WHERE pr.userId=?
      ORDER BY pr.redeemedAt DESC
    `).all(ctx.user!.id);
  }),
  adminList: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM promoCodes ORDER BY createdAt DESC").all();
  }),
  adminCreate: adminProcedure
    .input(z.object({
      code: z.string().min(3).max(64),
      type: z.enum(["first_deposit","gift","random"]),
      rewardType: z.enum(["fixed","percent"]),
      rewardValue: z.number().positive(),
      maxRedemptions: z.number().int().positive(),
      expiresAt: z.string().datetime().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO promoCodes (code,type,rewardType,rewardValue,maxRedemptions,expiresAt,createdBy,createdAt)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(
        input.code,
        input.type,
        input.rewardType,
        input.rewardValue,
        input.maxRedemptions,
        input.expiresAt ?? null,
        ctx.user!.id,
        now
      );
      return { success: true };
    }),
});
