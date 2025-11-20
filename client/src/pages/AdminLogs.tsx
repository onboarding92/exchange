import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  Shield,
  FileText,
  Loader2,
  AlertCircle,
  Filter,
  Search as SearchIcon,
} from "lucide-react";

type AdminUser = {
  id: number;
  email: string;
  role: string;
};

export default function AdminLogs() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [level, setLevel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [submittedFilters, setSubmittedFilters] = useState({
    level: "all",
    search: "",
  });

  const logsQuery = trpc.auth.adminListLogs.useQuery(
    {
      level: submittedFilters.level === "all" ? undefined : (submittedFilters.level as any),
      search: submittedFilters.search || undefined,
      limit: 200,
    },
    {
      enabled: isAuthenticated && !loading,
    }
  );

  const isAdmin =
    meQuery.data?.user && (meQuery.data.user as AdminUser).role === "admin";

  if (loading || meQuery.isLoading || logsQuery.isLoading) {
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
              Admin – Logs
            </CardTitle>
            <CardDescription>
              You must be logged in as an admin to view system logs.
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

  const logs = logsQuery.data ?? [];

  const handleApplyFilters = () => {
    setSubmittedFilters({
      level,
      search,
    });
    logsQuery.refetch();
  };

  const levelColor = (lvl: string) => {
    switch (lvl) {
      case "info":
        return "bg-sky-600 hover:bg-sky-700";
      case "warn":
        return "bg-amber-500 hover:bg-amber-600";
      case "error":
        return "bg-red-600 hover:bg-red-700";
      case "security":
        return "bg-purple-600 hover:bg-purple-700";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <FileText className="h-7 w-7" />
              Admin – Logs
            </h1>
            <p className="text-muted-foreground">
              View recent system and security events (auth, KYC, withdrawals, etc.).
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <CardDescription>Adjust the level and search text to narrow down logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <span className="text-xs font-medium">Level</span>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium">Search</span>
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search in message or context JSON..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button type="button" onClick={handleApplyFilters} disabled={logsQuery.isFetching}>
                  {logsQuery.isFetching && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent logs</CardTitle>
            <CardDescription>
              Showing up to {logs.length} entries. Use filters above to refine the results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsQuery.isError && (
              <div className="mb-4 flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Failed to load logs. Please try again later.</p>
              </div>
            )}

            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs found for the selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Time</TableHead>
                      <TableHead className="whitespace-nowrap">Level</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => {
                      const dateStr = new Date(log.createdAt).toLocaleString();
                      let ctx: string = "";
                      try {
                        if (log.contextJson) {
                          const parsed = JSON.parse(log.contextJson);
                          ctx = JSON.stringify(parsed, null, 0);
                        }
                      } catch {
                        ctx = log.contextJson || "";
                      }

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs md:text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={levelColor(log.level)}>
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm max-w-md">
                            {log.message}
                          </TableCell>
                          <TableCell className="text-[11px] md:text-xs max-w-md">
                            <div className="truncate" title={ctx}>
                              {ctx || <span className="text-muted-foreground">—</span>}
                            </div>
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
