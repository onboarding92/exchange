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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { AlertCircle, SendHorizonal, Loader2, Users } from "lucide-react";

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

export default function InternalTransfer() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const historyQuery = trpc.internal.historyForUser.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [recipientEmail, setRecipientEmail] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("10");
  const [memo, setMemo] = useState("");

  const transferMutation = trpc.internal.createTransfer.useMutation({
    onSuccess() {
      historyQuery.refetch();
      setAmount("10");
      setMemo("");
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
              <Users className="h-5 w-5" />
              Internal transfers
            </CardTitle>
            <CardDescription>
              You must be logged in to send internal transfers.
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    transferMutation.mutate({
      recipientEmail,
      asset,
      amount: amt,
      memo: memo || undefined,
    } as any);
  };

  const rows = historyQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <SendHorizonal className="h-7 w-7" />
              Internal transfers
            </h1>
            <p className="text-muted-foreground">
              Send balance to other users on the platform instantly, without using any
              external network or gas fees.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
          {/* Left: form */}
          <Card>
            <CardHeader>
              <CardTitle>Send to another user</CardTitle>
              <CardDescription>
                Enter the recipient&apos;s email, select an asset and amount, and confirm
                the transfer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset</Label>
                    <select
                      id="asset"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                    >
                      {DEFAULT_ASSETS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (optional)</Label>
                  <Input
                    id="memo"
                    placeholder="For example: Payment for course"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={transferMutation.isPending || !recipientEmail || !amount}
                  >
                    {transferMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send transfer
                  </Button>
                </div>

                {transferMutation.isError && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>
                      Failed to create internal transfer. Please check your inputs or
                      your balance and try again.
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Right: history */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Your internal transfers</CardTitle>
              <CardDescription>
                History of transfers you sent or received from other users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any internal transfers yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Memo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((t: any) => {
                        const dateStr = t.createdAt
                          ? new Date(t.createdAt).toLocaleString()
                          : "-";
                        const direction =
                          t.fromUserId === (historyQuery.data?.[0]?.userId ?? null)
                            ? "Sent"
                            : "Sent/received"; // fallback if we don't know; you can improve later

                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs md:text-sm">
                              {dateStr}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.fromUserId === t.toUserId
                                ? "Self"
                                : t.fromUserId === undefined
                                ? "-"
                                : t.fromUserId === (historyQuery.data?.[0]?.userId ?? null)
                                ? "Sent"
                                : "Received"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.asset}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.amount}
                            </TableCell>
                            <TableCell className="text-xs md:text-xs">
                              {/* we only have IDs here; for now show user IDs; can join emails later */}
                              From #{t.fromUserId} / To #{t.toUserId}
                            </TableCell>
                            <TableCell className="text-xs md:text-xs">
                              {t.memo || "—"}
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
        </div>
      </main>
    </div>
  );
}
