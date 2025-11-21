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
import {
  Loader2,
  Shield,
  AlertTriangle,
  MonitorSmartphone,
} from "lucide-react";

type LoginHistoryRow = {
  id: number;
  userId: number | null;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  success: number;
  createdAt: string;
  metadataJson: string | null;
};

function parseDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android device";
  if (ua.includes("mac os")) return "Mac";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";

  return "Unknown device";
}

function parseBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";

  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome") && !ua.includes("edge") && !ua.includes("opr"))
    return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opr") || ua.includes("opera")) return "Opera";

  return "Unknown browser";
}

export default function LoginHistory() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const historyQuery = trpc.loginHistory.historyForUser.useQuery(
    { limit: 50 } as any,
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
              <Shield className="h-5 w-5" />
              Login history
            </CardTitle>
            <CardDescription>
              You must be logged in to view your login history.
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

  const rows = (historyQuery.data ?? []) as LoginHistoryRow[];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <MonitorSmartphone className="h-7 w-7" />
              Login history
            </h1>
            <p className="text-muted-foreground">
              Review recent logins and verify that all sessions are legitimate.
            </p>
          </div>
        </header>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent logins</CardTitle>
            <CardDescription>
              If you see an IP or device you don&apos;t recognize, change your password
              and contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertTriangle className="h-4 w-4" />
                <span>No login events recorded yet for this account.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const dateStr = r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "-";
                      const device = parseDevice(r.userAgent);
                      const browser = parseBrowser(r.userAgent);
                      const success = r.success === 1;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs md:text-sm">
                            {dateStr}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {r.ip || "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {device}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {browser}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {r.method || "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <span
                              className={
                                success
                                  ? "text-emerald-400"
                                  : "text-red-400 flex items-center gap-1"
                              }
                            >
                              {!success && (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {success ? "Success" : "Failed"}
                            </span>
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
