import { useMemo } from "react";
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
  Shield,
  Lock,
  MonitorSmartphone,
  AlertTriangle,
  Loader2,
  CheckCircle2,
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

type DeviceGroup = {
  key: string;
  ip: string | null;
  userAgent: string | null;
  device: string;
  browser: string;
  lastSeenAt: string;
  lastSuccess: boolean;
  totalLogins: number;
  failedLogins: number;
};

export default function Security() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const historyQuery = trpc.loginHistory.historyForUser.useQuery(
    { limit: 100 } as any,
    { enabled: isAuthenticated && !loading }
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
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account security
            </CardTitle>
            <CardDescription>
              You must be logged in to manage your security settings.
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

  const devices: DeviceGroup[] = useMemo(() => {
    if (!rows.length) return [];

    const map = new Map<string, DeviceGroup>();

    for (const r of rows) {
      const device = parseDevice(r.userAgent);
      const browser = parseBrowser(r.userAgent);
      const ip = r.ip ?? "Unknown IP";
      const key = `${ip}__${device}__${browser}`;

      const createdAtTime = r.createdAt ? new Date(r.createdAt) : null;
      const createdAtIso = createdAtTime?.toISOString() ?? r.createdAt ?? "";

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          ip: r.ip ?? null,
          userAgent: r.userAgent ?? null,
          device,
          browser,
          lastSeenAt: createdAtIso,
          lastSuccess: r.success === 1,
          totalLogins: 1,
          failedLogins: r.success === 1 ? 0 : 1,
        });
      } else {
        // update stats
        existing.totalLogins += 1;
        if (r.success !== 1) {
          existing.failedLogins += 1;
        }

        if (createdAtTime) {
          const existingTime = existing.lastSeenAt
            ? new Date(existing.lastSeenAt)
            : null;
          if (!existingTime || createdAtTime > existingTime) {
            existing.lastSeenAt = createdAtIso;
            existing.lastSuccess = r.success === 1;
          }
        }
      }
    }

    // sort by lastSeenAt desc
    return Array.from(map.values()).sort((a, b) => {
      const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return tb - ta;
    });
  }, [rows]);

  const lastLogin = rows.length
    ? rows
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
    : null;

  const lastLoginDate =
    lastLogin?.createdAt && new Date(lastLogin.createdAt).toLocaleString();

  const lastLoginIp = lastLogin?.ip ?? "Unknown";
  const lastLoginDevice = parseDevice(lastLogin?.userAgent ?? null);
  const lastLoginBrowser = parseBrowser(lastLogin?.userAgent ?? null);

  const hasFailedLogins = rows.some((r) => r.success !== 1);

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Shield className="h-7 w-7" />
              Account security
            </h1>
            <p className="text-muted-foreground">
              Review your recent logins and devices. If you see anything
              suspicious, change your password immediately and contact support.
            </p>
          </div>
        </header>

        {/* Security summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Latest login
              </CardTitle>
              <CardDescription className="text-xs">
                Most recent access to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="font-medium">Time:</span>{" "}
                {lastLoginDate || "No login events recorded yet"}
              </div>
              <div>
                <span className="font-medium">IP:</span> {lastLoginIp}
              </div>
              <div>
                <span className="font-medium">Device:</span>{" "}
                {lastLoginDevice} · {lastLoginBrowser}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4" />
                Devices
              </CardTitle>
              <CardDescription className="text-xs">
                Unique devices that have logged into your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="font-medium">Known devices:</span>{" "}
                {devices.length}
              </div>
              <div>
                <span className="font-medium">Total logins:</span>{" "}
                {rows.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {hasFailedLogins ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                Login health
              </CardTitle>
              <CardDescription className="text-xs">
                Failed login attempts can indicate brute-force or guessing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {hasFailedLogins ? (
                  <span className="text-red-400">Attention needed</span>
                ) : (
                  <span className="text-emerald-400">No issues detected</span>
                )}
              </div>
              {hasFailedLogins && (
                <p className="text-[11px] text-muted-foreground">
                  One or more failed login attempts were detected. If these
                  weren&apos;t you, change your password and enable additional
                  security measures.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Devices & logins table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent devices & IP addresses</CardTitle>
            <CardDescription>
              These are the devices and IP addresses that have recently accessed
              your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : devices.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertTriangle className="h-4 w-4" />
                <span>No login events recorded yet for this account.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead className="text-right">
                        Logins / Failed
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((d) => {
                      const lastSeen =
                        d.lastSeenAt &&
                        new Date(d.lastSeenAt).toLocaleString();
                      return (
                        <TableRow key={d.key}>
                          <TableCell className="text-xs md:text-sm">
                            {d.ip || "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.device}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {d.browser}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {lastSeen || "-"}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-right">
                            {d.totalLogins} /{" "}
                            {d.failedLogins > 0 ? (
                              <span className="text-red-400">
                                {d.failedLogins}
                              </span>
                            ) : (
                              d.failedLogins
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


// ========== TFA TEMP UI ==========
export function TfaBox() {
  return <div style={{padding:20}}>
    <h3>Two-Factor Authentication</h3>
    <button onClick={() => alert("TFA enable placeholder")}>Enable TFA</button>
  </div>
}
