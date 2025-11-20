import { GatewayAdapter, QuoteRequest, QuoteResponse, OrderRequest, OrderResponse, WebhookNormalized } from "./types";

export const banxaAdapter: GatewayAdapter = {
  name: "banxa",
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    return { provider: "banxa", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    return { provider: "banxa", orderId: "pending", checkoutUrl: "https://placeholder.banxa.com" };
  },
  verifyWebhookSignature() { return true; },
  normalizeWebhook(body: any): WebhookNormalized {
    return { provider: "banxa", orderId: "unknown", status: "pending", raw: body };
  },
};
