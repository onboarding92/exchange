const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export type MarketAsset = {
  symbol: string;  // e.g. "BTC"
  id: string;      // CoinGecko id, e.g. "bitcoin"
  name: string;    // "Bitcoin"
};

export type Ticker = {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
};

export type PricePoint = {
  timestamp: number; // ms since epoch
  priceUsd: number;
};

const SUPPORTED_ASSETS: MarketAsset[] = [
  { symbol: "BTC", id: "bitcoin",       name: "Bitcoin" },
  { symbol: "ETH", id: "ethereum",      name: "Ethereum" },
  { symbol: "USDT", id: "tether",       name: "Tether" },
  { symbol: "BNB", id: "binancecoin",   name: "BNB" },
  { symbol: "ADA", id: "cardano",       name: "Cardano" },
  { symbol: "SOL", id: "solana",        name: "Solana" },
  { symbol: "XRP", id: "ripple",        name: "XRP" },
  { symbol: "DOT", id: "polkadot",      name: "Polkadot" },
  { symbol: "DOGE", id: "dogecoin",     name: "Dogecoin" },
  { symbol: "AVAX", id: "avalanche-2",  name: "Avalanche" },
  { symbol: "SHIB", id: "shiba-inu",    name: "Shiba Inu" },
  { symbol: "MATIC", id: "polygon",     name: "Polygon" },
  { symbol: "LTC", id: "litecoin",      name: "Litecoin" },
  { symbol: "LINK", id: "chainlink",    name: "Chainlink" },
  { symbol: "XLM", id: "stellar",       name: "Stellar" },
];

export function listSupportedAssets(): MarketAsset[] {
  return SUPPORTED_ASSETS;
}

// --- Simple in-memory cache ---

type TickerCache = {
  data: Ticker[];
  fetchedAt: number;
};

type HistoryCache = {
  [symbol: string]: {
    data: PricePoint[];
    fetchedAt: number;
  };
};

let tickerCache: TickerCache | null = null;
const historyCache: HistoryCache = {};

const TICKER_TTL_MS = 30_000;   // 30 seconds
const HISTORY_TTL_MS = 60_000;  // 1 minute

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Market API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Fetch current tickers for all supported assets
export async function getTickers(): Promise<Ticker[]> {
  const now = Date.now();

  if (tickerCache && now - tickerCache.fetchedAt < TICKER_TTL_MS) {
    return tickerCache.data;
  }

  const ids = SUPPORTED_ASSETS.map((a) => a.id).join(",");
  const url =
    `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(
      ids
    )}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  const json = (await fetchJson(url)) as any;

  const tickers: Ticker[] = SUPPORTED_ASSETS.map((asset) => {
    const entry = json[asset.id];
    if (!entry) {
      return {
        symbol: asset.symbol,
        name: asset.name,
        priceUsd: 0,
        change24h: null,
        marketCap: null,
        volume24h: null,
      };
    }
    return {
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: typeof entry.usd === "number" ? entry.usd : 0,
      change24h:
        typeof entry.usd_24h_change === "number" ? entry.usd_24h_change : null,
      marketCap:
        typeof entry.usd_market_cap === "number"
          ? entry.usd_market_cap
          : null,
      volume24h:
        typeof entry.usd_24h_vol === "number" ? entry.usd_24h_vol : null,
    };
  });

  tickerCache = { data: tickers, fetchedAt: now };
  return tickers;
}

// Fetch 24h history for a single asset (hourly resolution)
export async function getHistory(symbol: string): Promise<PricePoint[]> {
  const asset = SUPPORTED_ASSETS.find(
    (a) => a.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!asset) {
    throw new Error(`Unsupported asset symbol: ${symbol}`);
  }

  const now = Date.now();
  const cached = historyCache[asset.symbol];
  if (cached && now - cached.fetchedAt < HISTORY_TTL_MS) {
    return cached.data;
  }

  const url = `${COINGECKO_BASE}/coins/${asset.id}/market_chart?vs_currency=usd&days=1&interval=hourly`;
  const json = (await fetchJson(url)) as any;

  const prices: PricePoint[] = Array.isArray(json.prices)
    ? json.prices.map((row: any) => {
        const ts = Array.isArray(row) ? row[0] : null;
        const price = Array.isArray(row) ? row[1] : null;
        return {
          timestamp: typeof ts === "number" ? ts : Date.now(),
          priceUsd: typeof price === "number" ? price : 0,
        };
      })
    : [];

  historyCache[asset.symbol] = { data: prices, fetchedAt: now };
  return prices;
}
