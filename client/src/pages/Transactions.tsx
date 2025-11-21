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
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ListTree,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  Search as SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type UnifiedTransaction = {
  id: string;
  type: "deposit" | "withdrawal" | "internal_sent" | "internal_received";
  asset: string;
  amount: number;
  direction: "in" | "out";
  status?: string;
  createdAt: string;
  description: string;
};

const TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "internal_sent", label: "Internal sent" },
  { value: "internal_received", label: "Internal received" },
];

const DIR_FILTERS = [
  { value: "all", label: "All directions" },
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
];

export default function Transactions() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [typeFilter, setTypeFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [search, setSearch] = useState("");

  const txQuery = trpc.transactions.historyForUser.useQuery(
    { limit: 200 } as any,
    { enabled: isAuthenticated && !loading }
  );

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
              <ListTree className="h-5 w-5" />
              Transaction history
            </CardTitle>
            <CardDescription>
              You must be logged in to view your transaction history.
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

  let rows = (txQuery.data ?? []) as UnifiedTransaction[];

  // Filters
  rows = rows.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (dirFilter !== "all" && tx.direction !== dirFilter) return false;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      const combined =
        (tx.asset || "") +
        " " +
        (tx.description || "") +
        " " +
        (tx.status || "") +
        " " +
        tx.id;
      if (!combined.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const typeLabel = (tx: UnifiedTransaction) => {
    switch (tx.type) {
      case "deposit":
        return "Deposit";
      case "withdrawal":
        return "Withdrawal";
      case "internal_sent":
        return "Internal (sent)";
      case "internal_received":
        return "Internal (received)";
      default:
        return tx.type;
    }
  };

  const typeIcon = (tx: UnifiedTransaction) => {
    if (tx.type === "deposit" || tx.direction === "in") {
      return <ArrowDownToLine className="h-3 w-3 mr-1" />;
    }
    if (tx.type === "withdrawal" || tx.direction === "out") {
      return <ArrowUpFromLine className="h-3 w-3 mr-1" />;
    }
    return <ArrowRightLeft className="h-3 w-3 mr-1" />;
  };

  const statusClass = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "approved") {
      return "border-emerald-500 text-emerald-400";
    }
    if (s === "pending") {
      return "border-amber-500 text-amber-300";
    }
    if (s === "rejected" || s === "failed") {
      return "border-red-500 text-red-400";
    }
    return "border-border text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <ListTree className="h-7 w-7" />
              Transaction history
            </h1>
            <p className="text-muted-foreground">
              A consolidated view of your deposits, withdrawals, and internal transfers.
            </p>
          </div>
        </header>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter by type, direction, or search by asset / description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[160px_160px_minmax(0,1.4fr)]">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {TYPE_FILTERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <select
                  id="direction"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={dirFilter}
                  onChange={(e) => setDirFilter(e.target.value)}
                >
                  {DIR_FILTERS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    className="pl-8"
                    placeholder="Search by asset, status, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>All transactions</CardTitle>
            <CardDescription>
              Showing {rows.length} record(s). Most recent first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {txQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions found yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((tx) => {
                      const dateStr = tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString()
                        : "-";
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs md:text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <span className="inline-flex items-center gap-1">
                              {typeIcon(tx)}
                              {typeLabel(tx)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {tx.asset}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {tx.direction === "out" ? "-" : "+"}
                            {tx.amount}
                          </TableCell>
                          <TableCell className="text-xs md:text-xs">
                            {tx.status ? (
                              <Badge
                                variant="outline"
                                className={statusClass(tx.status)}
                              >
                                {tx.status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs md:text-xs">
                            {tx.description}
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
