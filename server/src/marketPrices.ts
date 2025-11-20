import { logError } from "./logger";

const ASSET_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  SOL: "solana",
  DOGE: "dogecoin",
  TRX: "tron",
  MATIC: "matic-network",
  LTC: "litecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  SHIB: "shiba-inu",
};

type PriceCache = {
  data: Record<string, number>;
  timestamp: number;
};

const CACHE_TTL_MS = 30_000; // 30 seconds
let cache: PriceCache | null = null;

function nowMs() {
  return Date.now();
}

/**
 * Get USD prices for a set of assets (BTC, ETH, USDT, ...).
 * Uses CoinGecko simple price API + a short in-memory cache.
 */
export async function getUsdPrices(
  assets: string[]
): Promise<Record<string, number>> {
  const normalized = Array.from(
    new Set(
      assets.map((a) => a.trim().toUpperCase()).filter((a) => a.length > 0)
    )
  );

  if (normalized.length === 0) {
    return {};
  }

  // If cache is fresh and contains all requested assets, return cached subset
  if (cache && nowMs() - cache.timestamp < CACHE_TTL_MS) {
    const out: Record<string, number> = {};
    for (const a of normalized) {
      if (cache.data[a] != null) {
        out[a] = cache.data[a];
      }
    }
    const allPresent = normalized.every((a) => out[a] != null);
    if (allPresent) {
      return out;
    }
  }

  const ids = new Set<string>();
  const assetToId: Record<string, string> = {};

  for (const a of normalized) {
    const id = ASSET_TO_COINGECKO[a];
    if (id) {
      ids.add(id);
      assetToId[a] = id;
    }
  }

  if (ids.size === 0) {
    // No supported assets
    return {};
  }

  const idList = Array.from(ids).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    idList
  )}&vs_currencies=usd`;

  try {
    // Node 18+ has global fetch
    const res = await (globalThis as any).fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as any;

    const fresh: Record<string, number> = {};
    for (const asset of normalized) {
      const id = assetToId[asset];
      if (!id) continue;
      const v = json[id]?.usd;
      if (typeof v === "number") {
        fresh[asset] = v;
      }
    }

    cache = {
      data: fresh,
      timestamp: nowMs(),
    };

    return fresh;
  } catch (err) {
    logError("Failed to fetch prices from CoinGecko", {
      error: String(err),
      url,
    });

    // Fallback: if we still have some cached values, return them
    if (cache && cache.data) {
      const out: Record<string, number> = {};
      for (const a of normalized) {
        if (cache.data[a] != null) {
          out[a] = cache.data[a];
        }
      }
      return out;
    }

    return {};
  }
}
