import { router, authedProcedure, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { getGateway, listGateways } from "./paymentGateways";
import { logInfo, logSecurity } from "./logger";
import "./depositsSchema"; // ensure columns exist

const providerEnum = z.enum([
  "moonpay",
  "changelly",
  "banxa",
  "transak",
  "mercuryo",
  "coingate",
]);

const assetSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");

const fiatSchema = z
  .string()
  .min(3)
  .max(3)
  .regex(/^[A-Z]{3}$/, "Fiat currency must be a 3-letter code (e.g. USD, EUR)");

export const paymentRouter = router({
  // List available providers
  listProviders: publicProcedure.query(() => {
    return listGateways();
  }),

  // Get a price quote from a provider (currently implemented for MoonPay)
  getQuote: authedProcedure
    .input(
      z.object({
        provider: providerEnum,
        asset: assetSchema,
        fiatCurrency: fiatSchema,
        fiatAmount: z.number().positive().max(1_000_000),
      })
    )
    .query(async ({ input }) => {
      const gw = getGateway(input.provider);
      const quote = await gw.getQuote({
        asset: input.asset,
        fiatCurrency: input.fiatCurrency,
        fiatAmount: input.fiatAmount,
      });
      return quote;
    }),

  // Create a new buy order via a payment gateway
  createOrder: authedProcedure
    .input(
      z.object({
        provider: providerEnum,
        asset: assetSchema,
        fiatCurrency: fiatSchema,
        fiatAmount: z.number().positive().max(1_000_000),
        walletAddress: z.string().min(10).max(200),
        redirectUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;
      const gw = getGateway(input.provider);

      const orderReq = {
        userId: user.id,
        asset: input.asset,
        fiatAmount: input.fiatAmount,
        walletAddress: input.walletAddress,
        redirectUrl: input.redirectUrl,
      };

      const order = await gw.createOrder(orderReq);

      const now = new Date().toISOString();

      const stmt = db.prepare(
        `INSERT INTO deposits
          (userId, asset, amount, gateway, status, createdAt, provider, providerOrderId, providerRaw)
         VALUES (?,?,?,?,?,?,?,?,?)`
      );

      const res = stmt.run(
        user.id,
        input.asset,
        input.fiatAmount,
        input.provider,
        "pending",
        now,
        input.provider,
        order.orderId,
        JSON.stringify({
          provider: input.provider,
          orderId: order.orderId,
          checkoutUrl: order.checkoutUrl,
        })
      );

      const depositId = Number(res.lastInsertRowid);

      logSecurity("Payment order created", {
        userId: user.id,
        email: user.email,
        provider: input.provider,
        depositId,
        providerOrderId: order.orderId,
      });

      return {
        depositId,
        provider: input.provider,
        providerOrderId: order.orderId,
        checkoutUrl: order.checkoutUrl,
      };
    }),
});
