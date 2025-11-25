import { useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/notifications";
import { ArrowUpRight, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

const DEFAULT_ASSETS = ["BTC", "ETH", "USDT", "USDC", "BNB", "XRP"];

export default function WithdrawPage() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const { notify } = useNotifications();

  const balancesQuery = trpc.wallet.balances.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const withdrawalsQuery = trpc.wallet.withdrawals.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const requestWithdrawalMutation = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      notify("success", "Withdrawal request created successfully.");
      withdrawalsQuery.refetch();
    },
    onError: (err) => {
      notify("error", err.message || "Failed to create withdrawal request.");
    },
  });

  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");

  const allBalances =
    (balancesQuery.data as { asset: string; balance: number }[] | undefined) ??
    [];

  const sortedAssets = useMemo(() => {
    const fromBalance = allBalances.map((b) => b.asset);
    const extras = DEFAULT_ASSETS.filter((a) => !fromBalance.includes(a));
    return [...fromBalance, ...extras];
  }, [allBalances]);

  const selectedBalance =
    allBalances.find((b) => b.asset === asset)?.balance ?? 0;

  const isSubmitting = requestWithdrawalMutation.isLoading;

  // Stati di caricamento / non loggato
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
              <ArrowUpRight className="h-5 w-5" />
              Withdrawals
            </CardTitle>
            <CardDescription>
              You must be logged in to request a withdrawal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium"
            >
              Go to login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!asset) {
      notify("error", "Please select an asset.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      notify("error", "Amount must be a positive number.");
      return;
    }
    if (!address || address.length < 10) {
      notify("error", "Please enter a valid withdrawal address.");
      return;
    }
    if (numericAmount > selectedBalance) {
      notify("error", "Insufficient balance for this withdrawal.");
      return;
    }

    requestWithdrawalMutation.mutate({
      asset,
      amount: numericAmount,
      address,
      twoFactorCode: twoFactorCode || undefined,
    } as any);
  };

  const withdrawals =
    (withdrawalsQuery.data as {
      id: number;
      asset: string;
      amount: number;
      address: string;
      status: string;
      createdAt: string;
      reviewedAt: string | null;
    }[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UserNav />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Withdraw
            </h1>
            <p className="text-sm text-muted-foreground">
              Request crypto withdrawals from your BitChange wallet. Requests
              may require manual approval by an admin.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span>2FA strongly recommended for withdrawals</span>
          </div>
        </div>

        {/* Balances snapshot */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>
                Available balances for withdrawal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balancesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading balances...
                </div>
              ) : allBalances.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No balances available yet.
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBalances.map((b) => (
                        <TableRow key={b.asset}>
                          <TableCell>{b.asset}</TableCell>
                          <TableCell className="text-right">
                            {b.balance.toFixed(8)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdraw form */}
          <Card>
            <CardHeader>
              <CardTitle>New withdrawal request</CardTitle>
              <CardDescription>
                Choose the asset, amount and destination address. Your request
                will be processed according to platform rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label>Asset</Label>
                  <Select
                    value={asset}
                    onValueChange={(val) => setAsset(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedAssets.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Balance: {selectedBalance.toFixed(8)} {asset}
                  </p>
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <Label>Destination address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your external wallet address"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Make sure the network and address are compatible with the
                    selected asset.
                  </p>
                </div>

                <div>
                  <Label>Two-factor code (optional but recommended)</Label>
                  <Input
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="6-digit 2FA code"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    If 2FA is enabled on your account, a valid code is required
                    to process the request.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting request...
                    </>
                  ) : (
                    "Submit withdrawal request"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal history */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal history</CardTitle>
            <CardDescription>
              All withdrawal requests for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading withdrawals...
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No withdrawals yet.
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Reviewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{w.id}</TableCell>
                        <TableCell>{w.asset}</TableCell>
                        <TableCell>{w.amount}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {w.address}
                        </TableCell>
                        <TableCell className="capitalize">
                          {w.status}
                        </TableCell>
                        <TableCell>
                          {new Date(w.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {w.reviewedAt
                            ? new Date(w.reviewedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
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
