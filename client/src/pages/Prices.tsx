import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";

type Ticker = {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
};

type HistoryPoint = {
  timestamp: number;
  priceUsd: number;
};

function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  }
  return `$${value.toFixed(4)}`;
}

function formatPrice(value: number) {
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  // small coins: show more decimals
  return `$${value.toFixed(6)}`;
}

function formatChange(change: number | null) {
  if (change == null || Number.isNaN(change)) return "—";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function MiniSparkline({
  points,
}: {
  points: HistoryPoint[];
}) {
  if (!points.length) return null;

  const width = 260;
  const height = 80;
  const values = points.map((p) => p.priceUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const normalized = points.map((p, idx) => {
    const x = (idx / Math.max(points.length - 1, 1)) * width;
    const y = height - ((p.priceUsd - min) / range) * height;
    return { x, y };
  });

  const path = normalized
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const first = points[0].priceUsd;
  const last = points[points.length - 1].priceUsd;
  const positive = last >= first;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      <path
        d={path}
        fill="none"
        stroke={positive ? "rgba(34,197,94,1)" : "rgba(248,113,113,1)"}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export default function Prices() {
  const { isAuthenticated, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [search, setSearch] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC");

  const tickersQuery = trpc.market.tickers.useQuery(undefined, {
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const historyQuery = trpc.market.history.useQuery(
    { symbol: selectedSymbol } as any,
    {
      enabled: !!selectedSymbol,
      staleTime: 60_000,
      refetchInterval: 60_000,
    }
  );

  const tickers = (tickersQuery.data?.tickers ?? []) as Ticker[];

  const filteredTickers = useMemo(() => {
    if (!search.trim()) return tickers;
    const term = search.trim().toLowerCase();
    return tickers.filter(
      (t) =>
        t.symbol.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term)
    );
  }, [tickers, search]);

  const selectedTicker = tickers.find(
    (t) => t.symbol === selectedSymbol
  );

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <LineChartIcon className="h-7 w-7" />
              Markets & live prices
            </h1>
            <p className="text-muted-foreground">
              Track real-time cryptocurrency prices and 24h performance.
            </p>
          </div>
          {!isAuthenticated && !authLoading && (
            <Button asChild variant="outline">
              <a href={getLoginUrl()}>
                <DollarSign className="h-4 w-4 mr-1" />
                Login to start trading
              </a>
            </Button>
          )}
        </header>

        {/* Search + status */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Market overview</CardTitle>
              <CardDescription>
                Prices are updated automatically every 30 seconds.
              </CardDescription>
            </div>
            <div className="w-full md:w-72 space-y-1">
              <Label htmlFor="search" className="sr-only">
                Search asset
              </Label>
              <Input
                id="search"
                placeholder="Search by symbol or name (BTC, Ethereum...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]">
          {/* Table: all assets */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assets</CardTitle>
                {tickersQuery.isFetching && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating prices…
                  </span>
                )}
              </div>
              <CardDescription>
                Click a row to view a simple price chart for that asset.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">24h change</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Market cap
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading prices…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTickers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        <span className="text-sm text-muted-foreground">
                          No assets match your search.
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickers.map((t) => {
                      const positive = (t.change24h ?? 0) >= 0;
                      return (
                        <TableRow
                          key={t.symbol}
                          className={
                            selectedSymbol === t.symbol
                              ? "bg-muted/40 cursor-pointer"
                              : "cursor-pointer hover:bg-muted/20"
                          }
                          onClick={() => setSelectedSymbol(t.symbol)}
                        >
                          <TableCell className="text-xs md:text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {t.symbol}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {t.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {formatPrice(t.priceUsd)}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            <span
                              className={
                                positive
                                  ? "inline-flex items-center justify-end gap-1 text-emerald-400"
                                  : "inline-flex items-center justify-end gap-1 text-red-400"
                              }
                            >
                              {positive ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {formatChange(t.change24h)}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs text-right hidden md:table-cell">
                            {formatUsd(t.marketCap ?? null)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Right: small chart + details */}
          <Card className="flex flex-col">
            <div className="px-6 pt-6 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">
                      {selectedTicker?.name || selectedSymbol}
                    </CardTitle>
                    {selectedTicker && (
                      <span className="text-xs text-muted-foreground">
                        {selectedTicker.symbol}
                      </span>
                    )}
                  </div>
                  {selectedTicker && (
                    <p className="text-sm text-muted-foreground">
                      Current price:{" "}
                      <span className="font-semibold">
                        {formatPrice(selectedTicker.priceUsd)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 flex flex-col gap-4">
              {historyQuery.isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : historyQuery.data?.points?.length ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1">
                    Last 24 hours – hourly snapshot
                  </div>
                  <MiniSparkline
                    points={historyQuery.data.points as any}
                  />
                  <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                    {selectedTicker && (
                      <>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">
                            24h change
                          </div>
                          <div
                            className={
                              (selectedTicker.change24h ?? 0) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {formatChange(selectedTicker.change24h)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">
                            Market cap
                          </div>
                          <div>{formatUsd(selectedTicker.marketCap)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  No chart data available for {selectedSymbol}.
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
