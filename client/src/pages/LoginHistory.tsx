import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield, Monitor, Globe2, AlertTriangle, Loader2, Clock } from "lucide-react";

export default function LoginHistory() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const { data, isLoading, isError } = trpc.auth.loginHistory.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  if (loading || isLoading) {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Login history
            </CardTitle>
            <CardDescription>
              You need to be logged in to view your recent login activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Go to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Monitor className="h-7 w-7" />
            Login history
          </h1>
          <p className="text-muted-foreground">
            Review recent sign-ins, including IP, device, and whether they appear suspicious.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Last logins
              </CardTitle>
              <CardDescription>
                Up to the last 20 successful logins for this account.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Normal
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Suspicious
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isError && (
              <p className="text-sm text-destructive mb-4">
                Failed to load login history. Please try again later.
              </p>
            )}

            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No login events recorded yet for this account.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>IP address</TableHead>
                      <TableHead>Device / Browser</TableHead>
                      <TableHead className="text-right">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e: any) => {
                      const dateStr = new Date(e.createdAt).toLocaleString();
                      const suspicious = e.isSuspicious === 1;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="font-mono text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              <Globe2 className="h-4 w-4 text-muted-foreground" />
                              <span>{e.ip}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm max-w-xs">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate" title={e.userAgent}>
                                {e.userAgent || "Unknown device"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {suspicious ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                                <AlertTriangle className="h-4 w-4" />
                                Suspicious
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                Normal
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
