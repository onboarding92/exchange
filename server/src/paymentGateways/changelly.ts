import { GatewayAdapter, QuoteRequest, QuoteResponse, OrderRequest, OrderResponse, WebhookNormalized } from "./types";

export const changellyAdapter: GatewayAdapter = {
  name: "changelly",
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    return { provider: "changelly", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    return { provider: "changelly", orderId: "pending", checkoutUrl: "https://placeholder.changelly.com" };
  },
  verifyWebhookSignature() { return true; },
  normalizeWebhook(body: any): WebhookNormalized {
    return { provider: "changelly", orderId: "unknown", status: "pending", raw: body };
  },
};
