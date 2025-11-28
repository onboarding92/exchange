/**
 * Minimal SMS helper stub.
 * Right now it just logs to console.
 * In production you would integrate a real provider (Twilio, Vonage, etc.)
 * and keep this API stable.
 */

export type SmsProvider = "twilio" | "other";

export type SmsConfig = {
  provider: SmsProvider;
  fromNumber: string;
  // Twilio-like config:
  accountSid?: string;
  authToken?: string;
};

/**
 * Load SMS config from environment variables.
 * This is only a stub, but gives you the contract.
 */
export function getSmsConfig(): SmsConfig | null {
  const provider = process.env.SMS_PROVIDER as SmsProvider | undefined;
  const fromNumber = process.env.SMS_FROM || "";

  if (!provider || !fromNumber) {
    return null;
  }

  return {
    provider,
    fromNumber,
    accountSid: process.env.SMS_ACCOUNT_SID,
    authToken: process.env.SMS_AUTH_TOKEN,
  };
}

/**
 * Send an SMS. For now we just log to console to avoid external dependencies.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const cfg = getSmsConfig();
  if (!cfg) {
    console.warn("[sms] No SMS config set; pretending to send SMS", {
      to,
      message,
    });
    return;
  }

  // Here is where you would call Twilio (or other provider) in real life.
  console.log("[sms] Sending SMS via provider", {
    provider: cfg.provider,
    from: cfg.fromNumber,
    to,
    message,
  });
}
