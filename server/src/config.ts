import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive())
    .default("4000" as any),

  DB_PATH: z.string().default("./data/exchange.db"),

  JWT_SECRET: z
    .string()
    .min(16)
    .optional(), // kept optional for now to avoid breaking existing setups
  JWT_EXPIRES_IN: z.string().default("7d"),

  CLIENT_URL: z.string().optional(),

  RATE_LIMIT_LOGIN_MAX: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive())
    .optional(),
  RATE_LIMIT_LOGIN_WINDOW_MS: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive())
    .optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive())
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .optional(),

  // Payment API placeholders
  MOONPAY_API_KEY: z.string().optional(),
  MOONPAY_API_SECRET: z.string().optional(),
  TRANSAK_API_KEY: z.string().optional(),
  MERCURYO_API_KEY: z.string().optional(),
  BANXA_API_KEY: z.string().optional(),
  COINGATE_API_KEY: z.string().optional(),
  CHANGELLY_API_KEY: z.string().optional(),

  LOG_LEVEL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn(
    "[config] Environment variables validation failed (non-fatal for now):",
    parsed.error.flatten()
  );
}

export const config = parsed.success
  ? parsed.data
  : ({} as z.infer<typeof envSchema>);
