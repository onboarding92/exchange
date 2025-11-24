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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

type LoginHistoryRow = {
  id?: number | string;
  createdAt?: string;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  location?: string | null;
};

export default function LoginHistory() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const loginHistoryQuery = trpc.auth.loginHistory.useQuery(
    undefined,
    {
      enabled: isAuthenticated && !loading,
    }
  );

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
            <CardTitle>Login history</CardTitle>
            <CardDescription>
              You need to be logged in to view your login history.
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

  const rows = (loginHistoryQuery.data ?? []) as LoginHistoryRow[];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <LogIn className="h-7 w-7" />
              Login history
            </h1>
            <p className="text-muted-foreground">
              Recent logins to your account, including IP address and device information.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Recent logins</CardTitle>
            <CardDescription>
              Successful and failed login attempts associated with your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginHistoryQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : loginHistoryQuery.isError ? (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Failed to load login history. Please try again later.</p>
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No login attempts recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const createdAt = row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "Unknown";

                      const key = String(row.id ?? idx);

                      return (
                        <TableRow key={key}>
                          <TableCell className="text-xs">
                            {createdAt}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.ip ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.location ?? "—"}
                          </TableCell>
                          <TableCell className="text-[11px] max-w-xs truncate">
                            {row.userAgent ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.success === false ? (
                              <span className="text-red-500 font-medium">
                                Failed
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-medium">
                                Success
                              </span>
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
