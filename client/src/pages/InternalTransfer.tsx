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
  ArrowRightLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

type TransferRow = {
  id: number;
  fromUserId: number;
  toUserId: number;
  asset: string;
  amount: number;
  note: string | null;
  status: string;
  createdAt: string;
};

export default function InternalTransfer() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const transfersQuery = trpc.internalTransfer.myTransfers.useQuery(
    { limit: 100 } as any,
    { enabled: isAuthenticated && !loading }
  );

  const createMutation = trpc.internalTransfer.createTransfer.useMutation({
    onSuccess() {
      setRecipientEmail("");
      setAsset("USDT");
      setAmount("");
      setNote("");
      transfersQuery.refetch();
    },
  });

  const [recipientEmail, setRecipientEmail] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !amount) return;

    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;

    createMutation.mutate({
      recipientEmail,
      asset,
      amount: parsed,
      note: note || undefined,
    } as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
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
              <ArrowRightLeft className="h-5 w-5" />
              Internal transfer
            </CardTitle>
            <CardDescription>
              You must be logged in to send funds to another user.
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

  const transfers = (transfersQuery.data ?? []) as TransferRow[];
  const userId = user?.id;

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <ArrowRightLeft className="h-7 w-7" />
              Internal transfer
            </h1>
            <p className="text-muted-foreground">
              Instantly send funds to another BitChange user using their email
              address. Transfers are processed inside the exchange and do not
              touch the blockchain.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
          {/* Transfer form */}
          <Card>
            <CardHeader>
              <CardTitle>Send funds</CardTitle>
              <CardDescription>
                Enter the recipient&apos;s email and the amount you want to send.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient email</Label>
                  <Input
                    id="recipient"
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset">Asset</Label>
                  <Input
                    id="asset"
                    type="text"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                    placeholder="USDT"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Asset symbol must match one of your wallet balances (e.g.
                    USDT, BTC, ETH).
                  </p>
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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Input
                    id="note"
                    type="text"
                    maxLength={255}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="For example: payment for course..."
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send
                  </Button>
                </div>
                {createMutation.isError && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>
                      {(createMutation.error as any)?.message ||
                        "Failed to create internal transfer."}
                    </p>
                  </div>
                )}
                {createMutation.isSuccess && (
                  <p className="mt-2 text-xs text-emerald-400">
                    Transfer created successfully.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Transfer history</CardTitle>
              <CardDescription>
                Recent internal transfers you sent or received.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfersQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any internal transfers yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direction</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Email / Note</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((t) => {
                        const isOutgoing = userId != null && t.fromUserId === userId;
                        const dateStr = t.createdAt
                          ? new Date(t.createdAt).toLocaleString()
                          : "-";
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs md:text-sm">
                              {isOutgoing ? "Sent" : "Received"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.asset}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-right">
                              {t.amount}
                            </TableCell>
                            <TableCell className="text-[11px] md:text-xs">
                              {t.note || "—"}
                            </TableCell>
                            <TableCell className="text-[11px] md:text-xs text-right capitalize">
                              {t.status}
                            </TableCell>
                            <TableCell className="text-[11px] md:text-xs text-right">
                              {dateStr}
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
