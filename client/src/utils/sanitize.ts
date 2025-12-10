/**
 * Replace commas, trim, and keep only digits + dot + minus sign.
 * This is meant for user-facing numeric inputs (amount, price, etc.).
 */
export function normalizeAmountInput(raw: string): string {
  if (!raw) return "";
  const replaced = raw.replace(",", ".").trim();
  // keep digits, dot and minus
  const cleaned = replaced.replace(/[^0-9.-]/g, "");
  return cleaned;
}

/**
 * Parse a normalized amount string to number.
 * Returns null if NaN or empty.
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Helper to validate that amount is >0 and not too large.
 */
export function validateAmountRange(
  value: number | null,
  options?: { min?: number; max?: number }
): string | null {
  if (value == null) return "Amount is required";
  const min = options?.min ?? 0;
  const max = options?.max ?? 1_000_000_000;
  if (value <= min) return `Amount must be greater than ${min}`;
  if (value > max) return `Amount must be <= ${max}`;
  return null;
}
