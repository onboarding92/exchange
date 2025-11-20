import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCcw, Loader2 } from "lucide-react";
import { useState } from "react";

const DEFAULT_ASSETS = [
  "BTC",
  "ETH",
  "USDT",
  "BNB",
  "XRP",
  "ADA",
  "SOL",
  "MATIC",
  "LTC",
  "DOT",
];

export default function Prices() {
  const [assets] = useState<string[]>(DEFAULT_ASSETS);

  const pricesQuery = trpc.wallet.marketPrices.useQuery(
    { assets },
    {
      refetchInterval: 15_000, // refresh every 15 seconds
    }
  );

  const { data: prices, isLoading, isFetching, isError } = pricesQuery;

  const rows = assets.map((asset) => ({
    asset,
    price: prices?.[asset] ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <TrendingUp className="h-7 w-7" />
              Market prices
            </h1>
            <p className="text-muted-foreground">
              Live USD spot prices for major assets. Data is fetched from a public price API
              and cached briefly on the backend.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pricesQuery.refetch()}
              disabled={isFetching}
            >
              {isFetching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <RefreshCcw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spot prices (USD)</CardTitle>
            <CardDescription>
              Updated every ~15 seconds. Values are indicative only and should not be used
              for real trading without a dedicated market data provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isError && (
              <p className="mb-4 text-sm text-destructive">
                Failed to load prices. Please try again later.
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Asset</TableHead>
                      <TableHead>Price (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.asset}>
                        <TableCell className="font-medium">{row.asset}</TableCell>
                        <TableCell className="text-sm">
                          {row.price != null
                            ? `$${row.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : <span className="text-muted-foreground">No data</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="mt-4 text-[11px] text-muted-foreground">
              Prices are provided for demonstration only. For production use you should add a
              dedicated pricing/market data service, handle rate limits, and implement
              proper caching and fallbacks.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
