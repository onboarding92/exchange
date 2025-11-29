/**
 * Minimal SMS helper stub.
 * Right now it only logs to console.
 * In production you plug a real provider (Twilio, Vonage, etc.).
 */

export type SmsProvider = "twilio" | "other";

export type SmsConfig = {
  provider: SmsProvider;
  fromNumber: string;
  accountSid?: string;
  authToken?: string;
};

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
 * Send an SMS — for now it's just a console.log.
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

  // Here you would call the real provider API.
  console.log("[sms] Sending SMS", {
    provider: cfg.provider,
    from: cfg.fromNumber,
    to,
    message,
  });
}
