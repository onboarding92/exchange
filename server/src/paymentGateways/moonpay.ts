import crypto from "crypto";
import {
  GatewayAdapter,
  QuoteRequest,
  QuoteResponse,
  OrderRequest,
  OrderResponse,
  WebhookNormalized,
} from "./types";

/**
 * Env variables (placeholders – you will fill them later):
 *
 * MOONPAY_API_KEY           -> publishable (pk_...)
 * MOONPAY_SECRET_KEY        -> secret key for signing widget URLs
 * MOONPAY_WEBHOOK_SECRET    -> webhook API key for verifying webhooks
 * MOONPAY_ENV               -> "sandbox" | "production" (default: sandbox)
 */

const PUBLISHABLE_API_KEY = process.env.MOONPAY_API_KEY || "";
const SECRET_KEY = process.env.MOONPAY_SECRET_KEY || "";
const WEBHOOK_SECRET = process.env.MOONPAY_WEBHOOK_SECRET || "";
const ENVIRONMENT = (process.env.MOONPAY_ENV || "sandbox`)toLowerCase();

const WIDGET_BASE =
  ENVIRONMENT === "production"
    ? "https://buy.moonpay.com"
    : "https://buy-sandbox.moonpay.com";

const API_BASE =
  ENVIRONMENT === "production"
    ? "https://api.moonpay.com"
    : "https://api.moonpay.com"; // same host, keys decide live/sandbox

function ensureConfig() {
  if (!PUBLISHABLE_API_KEY) {
    throw new Error("MOONPAY_API_KEY is not set");
  }
  if (!SECRET_KEY) {
    throw new Error("MOONPAY_SECRET_KEY is not set");
  }
  if (!WEBHOOK_SECRET) {
    // We don throw here in case you want to run without webhooks locally,
    // but verifyWebhookSignature() will fail if secret is missing.
    console.warn("[MoonPay] MOONPAY_WEBHOOK_SECRET is not set – webhook validation disabled");
  }
}

function buildWidgetUrl(params: Record<string, string | number | boolean>): string {
  const url = new URL(WIDGET_BASE);
  const searchParams = url.searchParams;

  // Required
  searchParams.set("apiKey", PUBLISHABLE_API_KEY);

  // Append given params
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  // Signature: HMAC-SHA256(secretKey, url.search) -> base64, URL-encoded
  // We must sign *only* the query string part, including the leading "?"
  // See MoonPay URL signing docs.
  const queryString = "?" + searchParams.toString();

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(queryString)
    .digest("base64");

  searchParams.set("signature", encodeURIComponent(signature));

  return url.toString();
}

/**
 * Verify MoonPay webhook signature using Moonpay-Signature-V2 header.
 *
 * Header format: "t=<timestamp>,s=<hexSignature>"
 * signed_payload = timestamp + "." + rawBody
 * signature = HMAC_SHA256(WEBHOOK_SECRET, signed_payload) hex
 */
function verifyMoonpayWebhook(headers: any, rawBody: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[MoonPay] WEBHOOK_SECRET missing, cannot verify webhook");
    return false;
  }

  const headerValue =
    headers["moonpay-signature-v2"] ||
    headers["Moonpay-Signature-V2"] ||
    headers["moonpay-signature"] ||
    headers["Moonpay-Signature"];

  if (!headerValue || typeof headerValue !== "string") {
    return false;
  }

  const parts = headerValue.split(",");
  const tPart = parts.find((p) => p.trim().startsWith("t="));
  const sPart = parts.find((p) => p.trim().startsWith("s="));

  if (!tPart || !sPart) {
    return false;
  }

  const timestamp = tPart.split("=")[1];
  const signature = sPart.split("=")[1];

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export const moonpayAdapter: GatewayAdapter = {
  name: "moonpay",

  /**
   * Get a real-time buy quote from MoonPay:
   * GET /v3/currencies/{currencyCode}/buy_quote
   */
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    ensureConfig();

    const currencyCode = req.asset.toLowerCase(); // e.g. btc, eth
    const baseCurrencyCode = req.fiatCurrency.toLowerCase(); // e.g. usd, eur

    const url = new URL(
      `${API_BASE}/v3/currencies/${encodeURIComponent(currencyCode)}/buy_quote`
    );
    url.searchParams.set("apiKey", PUBLISHABLE_API_KEY);
    url.searchParams.set("baseCurrencyAmount", String(req.fiatAmount));
    url.searchParams.set("baseCurrencyCode", baseCurrencyCode);
    url.searchParams.set("areFeesIncluded", "true");

    // You can optionally set paymentMethod, extraFeePercentage, etc.

    const res = await (globalThis as any).fetch(url.toString(), {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[MoonPay] Failed to fetch buy quote: HTTP ${res.status} ${text}`
      );
    }

    const json: any = await res.json();

    // Typical fields from MoonPay buy_quote:
    // baseCurrencyAmount, quoteCurrencyAmount, feeAmount, extraFeeAmount, networkFeeAmount
    const cryptoAmount = Number(json.quoteCurrencyAmount || 0);
    const feeAmount =
      Number(json.feeAmount || 0) +
      Number(json.extraFeeAmount || 0) +
      Number(json.networkFeeAmount || 0);

    return {
      provider: "moonpay",
      asset: req.asset,
      fiatAmount: req.fiatAmount,
      cryptoAmount,
      fees: feeAmount,
    };
  },

  /**
   * Create an "order" by generating a signed MoonPay widget URL.
   * This does NOT hit the MoonPay REST "create transaction" endpoint.
   * The user completes the flow in the widget.
   */
  async createOrder(req: OrderRequest): Promise<OrderResponse> {
    ensureConfig();

    const currencyCode = req.asset.toLowerCase();
    const baseCurrencyCode = "usd"; // you can adapt this to req.fiatCurrency if needed

    // External transaction ID = correlation between your deposit record and MoonPay
    const externalTransactionId = `moonpay-${req.userId}-${Date.now()}`;

    const params: Record<string, string | number | boolean> = {
      currencyCode,
      walletAddress: req.walletAddress,
      baseCurrencyCode,
      baseCurrencyAmount: req.fiatAmount,
      // lock amount so it matches what you show
      lockAmount: true,
      // pre-fill email + your custom tracking fields on widget side (optional; you can add later)
      // email: userEmail,
      externalTransactionId,
      // send user back to your app after flow; MoonPay will append ?transactionId=...&transactionStatus=...
      redirectURL: req.redirectUrl,
      // widget style
      theme: "dark",
    };

    const checkoutUrl = buildWidgetUrl(params);

    return {
      provider: "moonpay",
      orderId: externalTransactionId,
      checkoutUrl,
    };
  },

  /**
   * Verify webhook signature (Moonpay-Signature-V2).
   *
   * NOTE: `body` MUST be the RAW request body string, not parsed JSON.
   * Make sure Express/Koa is configured to give you raw body for this route.
   */
  verifyWebhookSignature(headers: any, body: string): boolean {
    return verifyMoonpayWebhook(headers, body);
  },

  /**
   * Normalize MoonPay webhook payload into internal format.
   * See MoonPay "Buy" webhook docs for full payload shape.
   */
  normalizeWebhook(body: any): WebhookNormalized {
    // Based on docs: { type, data: { id, status, cryptoTransactionId, quoteCurrencyAmount, ... } }
    const data = body?.data || {};
    const statusRaw = (data.status || "`)toString().toLowerCase();

    let status: WebhookNormalized["status"] = "pending";
    if (statusRaw === "completed" || statusRaw === "finished") {
      status = "completed";
    } else if (statusRaw === "failed") {
      status = "failed";
    }

    const txHash =
      data.cryptoTransactionId ||
      data.cryptoTransactionHash ||
      data.transactionHash ||
      undefined;

    const cryptoAmount =
      typeof data.quoteCurrencyAmount === "number"
        ? data.quoteCurrencyAmount
        : undefined;

    return {
      provider: "moonpay",
      orderId: data.externalTransactionId || data.id || "unknown",
      txHash,
      status,
      amountCrypto: cryptoAmount,
      raw: body,
    };
  },
};
