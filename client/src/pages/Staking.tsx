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
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Lock,
  Percent,
  Coins,
  AlertCircle,
} from "lucide-react";

type Product = {
  id: number;
  asset: string;
  name: string;
  apr: number;
  lockDays: number;
  minAmount: number;
  maxAmount: number | null;
};

type Position = {
  id: number;
  userId: number;
  productId: number;
  asset: string;
  amount: number;
  apr: number;
  lockDays: number;
  startedAt: string;
  closedAt: string | null;
  status: string;
  accruedReward: number;
};

export default function Staking() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const productsQuery = trpc.staking.listProducts.useQuery();
  const positionsQuery = trpc.staking.myPositions.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const stakeMutation = trpc.staking.stake.useMutation({
    onSuccess() {
      positionsQuery.refetch();
      setStakeAmount("");
      setSelectedProductId(null);
    },
  });

  const unstakeMutation = trpc.staking.unstake.useMutation({
    onSuccess() {
      positionsQuery.refetch();
    },
  });

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");

  const products = (productsQuery.data ?? []) as Product[];
  const positions = (positionsQuery.data ?? []) as Position[];

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const handleStakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    const amountNum = Number(stakeAmount);
    if (!amountNum || amountNum <= 0) return;

    stakeMutation.mutate({
      productId: selectedProductId,
      amount: amountNum,
    } as any);
  };

  const handleUnstake = (positionId: number) => {
    unstakeMutation.mutate({ positionId } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Lock className="h-7 w-7" />
              Staking
            </h1>
            <p className="text-muted-foreground">
              Lock your assets to earn passive rewards with fixed APR products.
            </p>
          </div>
        </header>

        {/* Products + stake form */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Staking products</CardTitle>
              <CardDescription>
                Available staking offers. Select one to see details and stake.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No staking products are available at the moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">APR</TableHead>
                        <TableHead className="text-right">Lock</TableHead>
                        <TableHead className="text-right">Limits</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow
                          key={p.id}
                          className={
                            selectedProductId === p.id
                              ? "bg-muted/40"
                              : "hover:bg-muted/20 cursor-pointer"
                          }
                          onClick={() => setSelectedProductId(p.id)}
                        >
                          <TableCell className="text-xs md:text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {p.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Asset: {p.asset}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            <span className="inline-flex items-center gap-1">
                              <Percent className="h-3 w-3" />
                              {p.apr.toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {p.lockDays === 0 ? "Flexible" : `${p.lockDays} days`}
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs text-right">
                            Min: {p.minAmount} {p.asset}
                            {p.maxAmount != null && (
                              <>
                                <br />
                                Max: {p.maxAmount} {p.asset}
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={
                                selectedProductId === p.id ? "default" : "outline"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductId(p.id);
                              }}
                            >
                              Stake
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stake</CardTitle>
              <CardDescription>
                Choose a product and amount. Funds will be locked in your wallet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You must be logged in to stake assets.
                  </p>
                  <Button asChild className="w-full">
                    <a href={getLoginUrl()}>Go to login</a>
                  </Button>
                </div>
              ) : !selectedProduct ? (
                <p className="text-sm text-muted-foreground">
                  Select a staking product from the list to continue.
                </p>
              ) : (
                <form onSubmit={handleStakeSubmit} className="space-y-4">
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{selectedProduct.name}</div>
                    <div className="text-muted-foreground text-xs">
                      Asset: {selectedProduct.asset} · APR:{" "}
                      {selectedProduct.apr.toFixed(2)}% · Lock:{" "}
                      {selectedProduct.lockDays === 0
                        ? "Flexible"
                        : `${selectedProduct.lockDays} days`}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ({selectedProduct.asset})</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={0}
                      step="0.00000001"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Min: {selectedProduct.minAmount} {selectedProduct.asset}
                      {selectedProduct.maxAmount != null &&
                        ` · Max: ${selectedProduct.maxAmount} ${selectedProduct.asset}`}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={
                        stakeMutation.isPending || !stakeAmount || !selectedProductId
                      }
                    >
                      {stakeMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Confirm stake
                    </Button>
                  </div>
                  {stakeMutation.isError && (
                    <div className="mt-1 flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <p>
                        {(stakeMutation.error as any)?.message ||
                          "Failed to create staking position. Please try again."}
                      </p>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Positions */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>My positions</CardTitle>
            <CardDescription>
              Active and closed staking positions with estimated rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                Login to view your staking positions.
              </p>
            ) : positionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any staking positions yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">APR</TableHead>
                      <TableHead className="text-right">Lock</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">
                        Est. reward
                      </TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((p) => {
                      const started = p.startedAt
                        ? new Date(p.startedAt).toLocaleDateString()
                        : "-";
                      const reward =
                        typeof p.accruedReward === "number"
                          ? p.accruedReward
                          : 0;

                      const canUnstake = p.status === "active";

                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs md:text-sm">
                            {p.asset}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {p.amount}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {p.apr.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs text-right">
                            {p.lockDays === 0
                              ? "Flexible"
                              : `${p.lockDays} days`}
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs text-right">
                            {started}
                          </TableCell>
                          <TableCell className="text-xs md:text-xs text-right capitalize">
                            {p.status}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {reward.toFixed(8)} {p.asset}
                          </TableCell>
                          <TableCell className="text-right">
                            {canUnstake && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnstake(p.id)}
                                disabled={unstakeMutation.isPending}
                              >
                                {unstakeMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Coins className="h-3 w-3 mr-1" />
                                )}
                                Unstake
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
