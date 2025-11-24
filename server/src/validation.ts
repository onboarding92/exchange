import { z } from "zod";

/**
 * Generic reusable constraints
 */
export const idSchema = z.number().int().positive();

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .email();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(128);

export const optionalStringSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v ?? null));

/**
 * Symbols, assets, currency codes
 */
export const assetSymbolSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[A-Za-z0-9._-]+$/, "Invalid asset symbol.");

/**
 * Monetary/amount schemas
 * Use cryptoAmountSchema for on-chain-like or high-precision assets.
 */
export const cryptoAmountSchema = z
  .number()
  .positive("Amount must be greater than zero.")
  .max(1_000_000_000, "Amount is too large.");

export const fiatAmountSchema = z
  .number()
  .positive("Amount must be greater than zero.")
  .max(100_000_000, "Fiat amount is too large.");

/**
 * Simple pagination schema
 */
export const paginationSchema = z
  .object({
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

/**
 * Generic date string schema (ISO)
 */
export const isoDateStringSchema = z
  .string()
  .refine(
    (value) => {
      if (!value) return false;
      const d = new Date(value);
      return !Number.isNaN(d.getTime());
    },
    {
      message: "Invalid ISO date string.",
    }
  );

/**
 * Helper for generic search/list endpoints
 */
export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();
