import { GatewayAdapter, QuoteRequest, QuoteResponse, OrderRequest, OrderResponse, WebhookNormalized } from "./types";

export const coingateAdapter: GatewayAdapter = {
  name: "coingate",
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    return { provider: "coingate", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    return { provider: "coingate", orderId: "pending", checkoutUrl: "https://placeholder.coingate.com" };
  },
  verifyWebhookSignature() { return true; },
  normalizeWebhook(body: any): WebhookNormalized {
    return { provider: "coingate", orderId: "unknown", status: "pending", raw: body };
  },
};
