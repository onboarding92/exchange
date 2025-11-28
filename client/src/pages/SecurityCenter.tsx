import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import {
import { trpc } from "../trpc";
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ShieldCheck,
  Activity as ActivityIcon,
  AlertCircle,
} from "lucide-react";

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

function parseMetadata(row: ActivityLogRow): any | null {
  if (!row.metadataJson) return null;
  try {
    return JSON.parse(row.metadataJson);
  } catch {
    return null;
  }
}

function mapToSecurityEvents(rows: ActivityLogRow[]): SecurityEvent[] {
  const result: SecurityEvent[] = [];

  for (const row of rows) {
    const meta = parseMetadata(row);

    // di base: info
    let severity: "info" | "warning" = "info";
    let label = row.description || row.type;

    switch (row.type) {
      case "login": {
        label = "Successful login";
        break;
      }
      case "withdrawal_request": {
        const asset = meta?.asset ?? "Unknown asset";
        const amount =
          meta?.amount !== undefined ? String(meta.amount) : "unknown amount";
        label = `Withdrawal request: ${asset} ${amount}`;
        break;
      }
      case "withdrawal_status_update": {
        const status = (meta?.status as string | undefined) ?? row.description;
        const asset = meta?.asset ?? "Unknown asset";
        const amount =
          meta?.amount !== undefined ? String(meta.amount) : "unknown amount";

        if (status === "approved") {
          label = `Withdrawal APPROVED: ${asset} ${amount}`;
          severity = "info";
        } else if (status === "rejected") {
          label = `Withdrawal REJECTED: ${asset} ${amount}`;
          severity = "warning";
        } else {
          label = `Withdrawal status changed: ${asset} ${amount} (${status})`;
        }
        break;
      }
      case "kyc_status_update": {
        const status = (meta?.status as string | undefined) ?? row.description;
        if (status === "approved") {
          label = "KYC approved";
        } else if (status === "rejected") {
          label = "KYC rejected";
          severity = "warning";
        } else {
          label = `KYC status changed (${status})`;
        }
        break;
      }
      default: {
        // altri eventi (internal_transfer, staking, ecc.) rimangono come description
        break;
      }
    }

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
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
              Overview of your account security and recent high-risk activity.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1 text-xs text-muted-foreground">
            <span>
              Logged in as:{" "}
              <span className="font-medium">{user?.email}</span>
            </span>
            <span>
              Account ID: <span className="font-mono">{user?.id}</span>
            </span>
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
                No critical issues detected in the recent activity log. Keep 2FA
                enabled and monitor this page when you see unusual withdrawals
                or KYC changes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ActivityIcon className="h-4 w-4" />
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
                • Keep 2FA enabled for both login and withdrawals.
              </p>
              <p className="text-xs">
                • Review withdrawal events and KYC changes regularly.
              </p>
              <p className="text-xs">
                • If you see withdrawals or logins you don&apos;t recognize,
                change your password and contact support.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabella eventi sicurezza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Recent security-related activity
            </CardTitle>
            <CardDescription>
              Logins, KYC updates and withdrawal operations linked to your
              account.
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
                      const dateStr = new Date(
                        ev.createdAt
                      ).toLocaleString();
                      return (
                        <TableRow key={ev.id}>
                          <TableCell className="text-xs">
                            {dateStr}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ev.label}
                          </TableCell>
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

// =======================================================
// Sessions / Device management section (Security Center)
// =======================================================

export function SessionsManagementSection() {
  const { data, isLoading, refetch } = trpc.auth.sessionsList.useQuery();
  const revokeSessionMutation = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      // Simple UX: reload list after revoke
      refetch();
      if (typeof window !== "undefined") {
        window.alert("Session revoked successfully.");
      }
    },
    onError: (err) => {
      console.error("revokeSession error", err);
      if (typeof window !== "undefined") {
        window.alert("Failed to revoke session: " + (err?.message ?? "Unknown error"));
      }
    },
  });

  const revokeOthersMutation = trpc.auth.revokeOtherSessions.useMutation({
    onSuccess: () => {
      refetch();
      if (typeof window !== "undefined") {
        window.alert("All other sessions revoked.");
      }
    },
    onError: (err) => {
      console.error("revokeOtherSessions error", err);
      if (typeof window !== "undefined") {
        window.alert("Failed to revoke other sessions: " + (err?.message ?? "Unknown error"));
      }
    },
  });

  const sessions = data ?? [];

  const handleRevoke = (token: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Do you really want to revoke this session?");
      if (!ok) return;
    }
    revokeSessionMutation.mutate({ token });
  };

  const handleRevokeOthers = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Do you want to revoke all other sessions?");
      if (!ok) return;
    }
    revokeOthersMutation.mutate();
  };

  return (
    <section className="mt-8 border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Active sessions</h2>
        <button
          className="px-3 py-1 text-sm rounded bg-red-600 text-white disabled:opacity-60"
          onClick={handleRevokeOthers}
          disabled={revokeOthersMutation.isLoading || isLoading}
        >
          Log out other devices
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Created at</th>
                <th className="text-left py-2 pr-4">Token</th>
                <th className="text-left py-2 pr-4">Current</th>
                <th className="text-left py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => (
                <tr key={s.token} className="border-b last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {s.createdAt}
                  </td>
                  <td className="py-2 pr-4 max-w-xs overflow-hidden text-ellipsis">
                    <code className="text-xs break-all">{s.token}</code>
                  </td>
                  <td className="py-2 pr-4">
                    {s.isCurrent ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Current device
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Other</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {!s.isCurrent && (
                      <button
                        className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
                        onClick={() => handleRevoke(s.token)}
                        disabled={revokeSessionMutation.isLoading}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NOTE:
         * To use this section inside your security page,
         * just render <SessionsManagementSection /> in the JSX.
         */}
    </section>
  );
}
