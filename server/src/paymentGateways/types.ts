export type QuoteRequest = {
  asset: string;
  fiatCurrency: string;    // e.g. "USD", "EUR"
  fiatAmount: number;
};

export type QuoteResponse = {
  provider: string;
  asset: string;
  fiatAmount: number;
  cryptoAmount: number;
  fees: number;
};

export type OrderRequest = {
  userId: number;
  asset: string;
  fiatAmount: number;
  walletAddress: string;
  redirectUrl: string;
};

export type OrderResponse = {
  provider: string;
  orderId: string;
  checkoutUrl: string;
};

export type WebhookNormalized = {
  provider: string;
  orderId: string;
  txHash?: string;
  status: "pending" | "completed" | "failed";
  amountCrypto?: number;
  raw: any;
};

export interface GatewayAdapter {
  name: string;

  getQuote(req: QuoteRequest): Promise<QuoteResponse>;

  createOrder(req: OrderRequest): Promise<OrderResponse>;

  verifyWebhookSignature(headers: any, body: string): boolean;

  normalizeWebhook(body: any): WebhookNormalized;
}
