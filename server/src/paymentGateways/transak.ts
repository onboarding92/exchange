import { GatewayAdapter, QuoteRequest, QuoteResponse, OrderRequest, OrderResponse, WebhookNormalized } from "./types";

export const transakAdapter: GatewayAdapter = {
  name: "transak",
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    return { provider: "transak", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    return { provider: "transak", orderId: "pending", checkoutUrl: "https://placeholder.transak.com" };
  },
  verifyWebhookSignature() { return true; },
  normalizeWebhook(body: any): WebhookNormalized {
    return { provider: "transak", orderId: "unknown", status: "pending", raw: body };
  },
};
