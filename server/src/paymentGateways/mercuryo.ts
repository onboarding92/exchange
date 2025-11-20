import { GatewayAdapter, QuoteRequest, QuoteResponse, OrderRequest, OrderResponse, WebhookNormalized } from "./types";

export const mercuryoAdapter: GatewayAdapter = {
  name: "mercuryo",
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    return { provider: "mercuryo", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    return { provider: "mercuryo", orderId: "pending", checkoutUrl: "https://placeholder.mercuryo.com" };
  },
  verifyWebhookSignature() { return true; },
  normalizeWebhook(body: any): WebhookNormalized {
    return { provider: "mercuryo", orderId: "unknown", status: "pending", raw: body };
  },
};
