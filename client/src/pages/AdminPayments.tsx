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
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  AlertCircle,
  Filter,
  CreditCard,
  Search as SearchIcon,
} from "lucide-react";

type AdminUser = {
  id: number;
  email: string;
  role: string;
};

const STATUS_OPTIONS = ["all", "pending", "completed", "failed", "rejected"];
const PROVIDER_OPTIONS = [
  "all",
  "moonpay",
  "changelly",
  "banxa",
  "transak",
  "mercuryo",
  "coingate",
];

export default function AdminPayments() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [search, setSearch] = useState("");
  const [submittedFilters, setSubmittedFilters] = useState({
    status: "all",
    provider: "all",
    search: "",
  });

  const depositsQuery = trpc.admin.listDeposits.useQuery(
    {
      status: submittedFilters.status === "all" ? undefined : submittedFilters.status,
      provider:
        submittedFilters.provider === "all" ? undefined : submittedFilters.provider,
      limit: 500,
    } as any,
    {
      enabled: isAuthenticated && !loading,
    }
  );

  const isAdmin =
    meQuery.data?.user && (meQuery.data.user as AdminUser).role === "admin";

  const handleApply = () => {
    setSubmittedFilters({
      status,
      provider,
      search,
    });
    depositsQuery.refetch();
  };

  if (loading || meQuery.isLoading || depositsQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UserNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin – Payments
            </CardTitle>
            <CardDescription>
              You must be logged in as an admin to view payment and deposit data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthenticated && (
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>Go to login</a>
              </Button>
            )}
            {isAuthenticated && !isAdmin && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>This account does not have admin permissions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  let rows = depositsQuery.data ?? [];

  // simple client-side search by user email / asset / providerOrderId
  if (submittedFilters.search.trim()) {
    const term = submittedFilters.search.trim().toLowerCase();
    rows = rows.filter((d: any) => {
      return (
        d.userEmail?.toLowerCase().includes(term) ||
        d.asset?.toLowerCase().includes(term) ||
        (d.providerOrderId && String(d.providerOrderId).toLowerCase().includes(term))
      );
    });
  }

  const statusVariant = (s: string) => {
    const v = s.toLowerCase();
    if (v === "completed") return "bg-emerald-600 hover:bg-emerald-700";
    if (v === "pending") return "bg-amber-500 hover:bg-amber-600";
    if (v === "failed" || v === "rejected") return "bg-red-600 hover:bg-red-700";
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <CreditCard className="h-7 w-7" />
              Admin – Payments & Deposits
            </h1>
            <p className="text-muted-foreground">
              Monitor all deposit activity across manual flows and external payment
              gateways.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter by status, provider, or search by user email / order ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[180px_180px_minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <span className="text-xs font-medium">Status</span>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium">Provider</span>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium">Search</span>
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="User email, asset, provider order ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button type="button" onClick={handleApply} disabled={depositsQuery.isFetching}>
                  {depositsQuery.isFetching && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All deposits</CardTitle>
            <CardDescription>
              Showing {rows.length} records (max 500). Use filters above to narrow down.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {depositsQuery.isError && (
              <div className="mb-4 flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Failed to load deposits. Please try again later.</p>
              </div>
            )}

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deposits match the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Provider Order ID
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((d: any) => {
                      const dateStr = d.createdAt
                        ? new Date(d.createdAt).toLocaleString()
                        : "-";
                      const statusText = d.status || "unknown";
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs md:text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.userEmail || `#${d.userId}`}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.asset}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.amount}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={statusVariant(statusText)}>
                              {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.provider || d.gateway || "-"}
                          </TableCell>
                          <TableCell className="text-xs md:text-[11px] max-w-xs truncate">
                            {d.providerOrderId || "—"}
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
