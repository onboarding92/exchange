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
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeftRight, CreditCard, Loader2, PlusCircle } from "lucide-react";
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

const DEFAULT_GATEWAYS = [
  "bank_transfer",
  "crypto_transfer",
  "manual",
];

export default function Deposit() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [, navigate] = useLocation();

  const depositsQuery = trpc.wallet.deposits.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [asset, setAsset] = useState<string>("BTC");
  const [amount, setAmount] = useState<string>("100");
  const [gateway, setGateway] = useState<string>("bank_transfer");

  const createDepositMutation = trpc.wallet.createDeposit.useMutation({
    onSuccess() {
      depositsQuery.refetch();
      setAmount("100");
    },
  });

  if (loading) {
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
              <ArrowLeftRight className="h-5 w-5" />
              Deposits
            </CardTitle>
            <CardDescription>
              You must be logged in to view and create deposits.
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

  const handleCreateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    createDepositMutation.mutate({
      asset,
      amount: amt,
      gateway,
    } as any);
  };

  const deposits = depositsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <ArrowLeftRight className="h-7 w-7" />
              Deposits
            </h1>
            <p className="text-muted-foreground">
              Fund your account either via internal/manual deposits or using external
              payment gateways like MoonPay and others.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => depositsQuery.refetch()}
            >
              Refresh history
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/deposit/gateway")}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Deposit via gateway
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          {/* Left: create deposit request */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create deposit request
              </CardTitle>
              <CardDescription>
                Use this to register a deposit you&apos;ll send via bank transfer,
                on-chain transfer, or another off-platform method that an admin will
                verify. For instant card deposits, use the payment gateway button.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDeposit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step="0.00000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gateway">Method / gateway</Label>
                  <Select value={gateway} onValueChange={setGateway}>
                    <SelectTrigger id="gateway">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_GATEWAYS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    This label is for internal tracking only. For third-party payment
                    gateways (MoonPay, etc.) use the dedicated &quot;Deposit via
                    gateway&quot; flow.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={createDepositMutation.isPending}
                  >
                    {createDepositMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create deposit request
                  </Button>
                </div>

                {createDepositMutation.isError && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>
                      Failed to create deposit. Please check your inputs or try again.
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Right: history */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Deposit history</CardTitle>
              <CardDescription>
                All deposit requests linked to your account, including provider-based
                payments when available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {depositsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : deposits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any deposit records yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Provider</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs">
                            {d.createdAt
                              ? new Date(d.createdAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{d.asset}</TableCell>
                          <TableCell className="text-sm">{d.amount}</TableCell>
                          <TableCell className="text-xs capitalize">
                            {d.status}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d.provider || d.gateway || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
