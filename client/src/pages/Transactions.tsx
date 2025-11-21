import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
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
import { Loader2, Filter } from "lucide-react";

type TxType = "deposit" | "withdrawal" | "trade" | "transfer";
type TxStatus = "pending" | "completed" | "failed";

type TransactionRow = {
  id: string;
  createdAt: string;
  type: TxType;
  asset: string;
  amount: number;
  status: TxStatus;
  reference: string;
};

const MOCK_TRANSACTIONS: TransactionRow[] = [
  {
    id: "tx_001",
    createdAt: new Date().toISOString(),
    type: "deposit",
    asset: "USDT",
    amount: 250,
    status: "completed",
    reference: "MoonPay #982133",
  },
  {
    id: "tx_002",
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    type: "withdrawal",
    asset: "BTC",
    amount: 0.005,
    status: "pending",
    reference: "To 1A1zP1... via cold wallet",
  },
  {
    id: "tx_003",
    createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    type: "trade",
    asset: "ETH",
    amount: 1.23,
    status: "completed",
    reference: "BUY ETH/USDT @ 3,100",
  },
  {
    id: "tx_004",
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    type: "transfer",
    asset: "USDT",
    amount: 50,
    status: "completed",
    reference: "Internal transfer to demo@bitchange.money",
  },
];

export default function Transactions() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [assetFilter, setAssetFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>
              You must be logged in to view your transactions.
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

  const filtered = MOCK_TRANSACTIONS.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (assetFilter && !tx.asset.toUpperCase().includes(assetFilter.toUpperCase())) {
      return false;
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      const txDate = new Date(tx.createdAt);
      if (txDate < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      const txDate = new Date(tx.createdAt);
      // include transactions on that day
      if (txDate > new Date(toDate.getTime() + 24 * 60 * 60 * 1000)) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Transaction history</h1>
            <p className="text-muted-foreground">
              View your deposits, withdrawals, internal transfers and trades in one place.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter by asset, type, status, or date range.
              </CardDescription>
            </div>
            <p className="text-[11px] text-muted-foreground max-w-md">
              <strong>Note:</strong> This page is wired with placeholder data for now. 
              Backend integration with real transaction logs will be added next.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as any)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="trade">Trade</SelectItem>
                    <SelectItem value="transfer">Internal transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as any)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Input
                  id="asset"
                  placeholder="USDT, BTC, ETH..."
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              A unified view of your on-platform activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions match the current filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((tx) => {
                      const dateStr = new Date(tx.createdAt).toLocaleString();
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs md:text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm capitalize">
                            {tx.type}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {tx.asset}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {tx.amount}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm capitalize">
                            {tx.status}
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs max-w-xs truncate">
                            {tx.reference}
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
