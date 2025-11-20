import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const DEFAULT_ASSETS = [
  "BTC",
  "ETH",
  "USDT",
  "USDC",
  "BNB",
  "XRP",
  "ADA",
  "SOL",
  "MATIC",
];

const DEFAULT_FIAT = ["USD", "EUR"];

export default function DepositGateway() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [, navigate] = useLocation();

  const providersQuery = trpc.payment.listProviders.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [provider, setProvider] = useState<string | null>(null);
  const [asset, setAsset] = useState<string>("BTC");
  const [fiatCurrency, setFiatCurrency] = useState<string>("USD");
  const [fiatAmount, setFiatAmount] = useState<string>("100");
  const [walletAddress, setWalletAddress] = useState<string>("");

  const numericAmount = Number(fiatAmount || "0");

  const quoteQuery = trpc.payment.getQuote.useQuery(
    {
      provider: (provider || "moonpay") as any,
      asset,
      fiatCurrency,
      fiatAmount: numericAmount > 0 ? numericAmount : 0,
    },
    {
      enabled:
        isAuthenticated &&
        !loading &&
        !!provider &&
        numericAmount > 0,
      retry: 1,
    }
  );

  const createOrderMutation = trpc.payment.createOrder.useMutation({
    onSuccess(data) {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  if (loading || providersQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UserNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Deposit via payment gateway
            </CardTitle>
            <CardDescription>
              You must be logged in to create a deposit with an external gateway.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Go to login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providers = providersQuery.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    if (!numericAmount || numericAmount <= 0) {
      return;
    }

    createOrderMutation.mutate({
      provider: provider as any,
      asset,
      fiatCurrency,
      fiatAmount: numericAmount,
      walletAddress,
      redirectUrl: window.location.origin + "/deposit",
    });
  };

  const quote = quoteQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <CreditCard className="h-7 w-7" />
              Deposit via gateway
            </h1>
            <p className="text-muted-foreground">
              Buy crypto with fiat using supported third-party providers. You&apos;ll be
              redirected to the provider&apos;s secure checkout.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/deposit")}
            >
              Back to deposits
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start a new deposit</CardTitle>
            <CardDescription>
              Choose a provider, asset, and amount. We&apos;ll show you an estimated
              crypto amount before redirecting you to the provider&apos;s checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {providersQuery.isError && (
              <div className="mb-4 flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Failed to load payment providers. Please try again later.</p>
              </div>
            )}

            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment gateways are currently configured. An administrator must add
                API keys and enable at least one provider.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={provider ?? undefined}
                      onValueChange={setProvider}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Choose a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset</Label>
                    <Select value={asset} onValueChange={setAsset}>
                      <SelectTrigger id="asset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_ASSETS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="fiatCurrency">Fiat currency</Label>
                    <Select
                      value={fiatCurrency}
                      onValueChange={setFiatCurrency}
                    >
                      <SelectTrigger id="fiatCurrency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_FIAT.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fiatAmount">Fiat amount</Label>
                    <Input
                      id="fiatAmount"
                      type="number"
                      min={10}
                      step="10"
                      value={fiatAmount}
                      onChange={(e) => setFiatAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Your wallet address</Label>
                  <Input
                    id="walletAddress"
                    placeholder="Paste your external wallet address where crypto will be sent"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Double-check this address. The provider will send purchased crypto
                    directly here. Deposits sent to a wrong address cannot be recovered.
                  </p>
                </div>

                {/* Quote box */}
                {provider && numericAmount > 0 && (
                  <div className="rounded-md border p-3 text-sm">
                    {quoteQuery.isLoading || quoteQuery.isFetching ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Fetching quote from {provider}...</span>
                      </div>
                    ) : quoteQuery.isError || !quote ? (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>
                          Could not fetch a quote from {provider}. You can still
                          continue, but the final amount will be shown on the
                          provider&apos;s checkout.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p>
                          Estimated receive:{" "}
                          <span className="font-semibold">
                            {quote.cryptoAmount.toFixed(8)} {asset}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fiat amount: {quote.fiatAmount.toFixed(2)} {fiatCurrency} •
                          Estimated total fees (provider + network):{" "}
                          {quote.fees.toFixed(2)} {fiatCurrency}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          This is an indicative quote provided by the gateway. Final
                          price may differ slightly due to market movements and provider
                          terms.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      createOrderMutation.isPending ||
                      !provider ||
                      !walletAddress ||
                      !fiatAmount
                    }
                  >
                    {createOrderMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Continue to provider
                  </Button>
                </div>

                {createOrderMutation.isError && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>
                      Failed to start payment with the selected provider. Please check
                      your inputs or try again later.
                    </p>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
