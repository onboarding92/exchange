/**
 * Centralized configuration for BitChange backend.
 * All required environment variables are validated here at startup.
 */

function must(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? "production",

  // Server port (used by src/index.ts)
  PORT: Number(process.env.PORT ?? process.env.APP_PORT ?? "3001"),

  // Secrets
  SESSION_SECRET: must("SESSION_SECRET"),
  JWT_SECRET: must("JWT_SECRET"),

  // Application base URL (used in emails / links)
  APP_URL: must("APP_URL"), // e.g. https://exchange.yourdomain.com

  // SMTP configuration
  SMTP_HOST: must("SMTP_HOST"),
  SMTP_PORT: Number(process.env.SMTP_PORT ?? "587"),
  SMTP_USER: must("SMTP_USER"),
  SMTP_PASS: must("SMTP_PASS"),

  // Optional: from address used in emails
  SMTP_FROM: process.env.SMTP_FROM ?? "no-reply@bitchange.money",

  // Security / limits (you can tune these in .env)
  MAX_LOGIN_ATTEMPTS_PER_5MIN: Number(process.env.MAX_LOGIN_ATTEMPTS_PER_5MIN ?? "20"),
  GLOBAL_RATE_LIMIT_PER_15MIN: Number(process.env.GLOBAL_RATE_LIMIT_PER_15MIN ?? "300"),
};
