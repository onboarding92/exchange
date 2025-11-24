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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, Activity, AlertCircle } from "lucide-react";

type ActivityLogRow = {
  id: number;
  userId: number | null;
  type: string;
  category: string;
  description: string;
  metadataJson: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

type SecurityEvent = {
  id: number;
  createdAt: string;
  label: string;
  ip: string | null;
  userAgent: string | null;
  severity: "info" | "warning";
};

function mapToSecurityEvents(rows: ActivityLogRow[]): SecurityEvent[] {
  const result: SecurityEvent[] = [];

  for (const row of rows) {
    let severity: "info" | "warning" = "info";

    if (row.category === "security") {
      if (row.type === "kyc_status_update") {
        severity = "info";
      }
    }

    if (row.type === "internal_transfer") {
      severity = "info";
    }

    // In futuro: altri tipi (login, 2fa, password change, ecc.)
    const label = row.description || row.type;

    result.push({
      id: row.id,
      createdAt: row.createdAt,
      label,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      severity,
    });
  }

  // ordina per data decrescente
  return result.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function SecurityCenter() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const activityQuery = trpc.activity.myActivity.useQuery(
    { limit: 200 } as any,
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
            <CardTitle>Security center</CardTitle>
            <CardDescription>
              You need to be logged in to manage your account security.
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

  const activityRows = (activityQuery.data ?? []) as ActivityLogRow[];
  const securityEvents = useMemo(
    () => mapToSecurityEvents(activityRows),
    [activityRows]
  );

  const lastEvent = securityEvents[0];

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-emerald-500" />
              Security center
            </h1>
            <p className="text-muted-foreground">
              Overview of your account security and recent sensitive activity.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1 text-xs text-muted-foreground">
            <span>Logged in as: <span className="font-medium">{user?.email}</span></span>
            <span>Account ID: <span className="font-mono">{user?.id}</span></span>
          </div>
        </header>

        {/* Riepilogo sicurezza */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Overall status
              </CardTitle>
              <CardDescription className="text-xs">
                Basic security health of your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                Protected
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                No critical security events detected in the recent activity log.
                Keep 2FA enabled and monitor this page regularly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Last security event
              </CardTitle>
              <CardDescription className="text-xs">
                Latest change affecting your account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastEvent ? (
                <>
                  <p className="text-xs font-medium">
                    {new Date(lastEvent.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1">{lastEvent.label}</p>
                  {lastEvent.ip && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      IP: {lastEvent.ip}
                    </p>
                  )}
                  {lastEvent.userAgent && (
                    <p className="text-[11px] text-muted-foreground">
                      Device: {lastEvent.userAgent}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No security-related events recorded yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Recommendations
              </CardTitle>
              <CardDescription className="text-xs">
                Suggested actions to keep your funds safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs">
                • Enable 2FA for login and withdrawals.
              </p>
              <p className="text-xs">
                • Review unusual transfers and staking operations.
              </p>
              <p className="text-xs">
                • Never share your 2FA codes or recovery phrases.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabella eventi sicurezza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent security-related activity
            </CardTitle>
            <CardDescription>
              KYC changes, internal transfers, and other sensitive operations
              linked to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : activityQuery.isError ? (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Failed to load security events. Please try again later.</p>
              </div>
            ) : securityEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No security events recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((ev) => {
                      const dateStr = new Date(ev.createdAt).toLocaleString();
                      return (
                        <TableRow key={ev.id}>
                          <TableCell className="text-xs">{dateStr}</TableCell>
                          <TableCell className="text-xs">{ev.label}</TableCell>
                          <TableCell className="text-xs">
                            {ev.ip ?? "—"}
                          </TableCell>
                          <TableCell className="text-[11px] max-w-xs truncate">
                            {ev.userAgent ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ev.severity === "info" ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500 text-emerald-500"
                              >
                                Info
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-500 text-amber-500"
                              >
                                Warning
                              </Badge>
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
