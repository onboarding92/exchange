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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Shield,
  LifeBuoy,
  AlertCircle,
} from "lucide-react";

type AdminUser = {
  id: number;
  email: string;
  role: string;
};

const STATUS_FILTERS = ["all", "open", "pending", "closed"];

export default function AdminSupport() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [statusFilter, setStatusFilter] = useState("open");
  const [categoryFilter, setCategoryFilter] = useState("");

  const ticketsQuery = trpc.support.listTickets.useQuery(
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter || undefined,
    } as any,
    { enabled: isAuthenticated && !loading }
  );

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const ticketDetailQuery = trpc.support.getTicket.useQuery(
    { ticketId: selectedTicketId! } as any,
    { enabled: isAuthenticated && !loading && selectedTicketId !== null }
  );

  const replyMutation = trpc.support.adminReply.useMutation({
    onSuccess() {
      ticketDetailQuery.refetch();
      ticketsQuery.refetch();
      setReplyMessage("");
      setReplyStatus("");
    },
  });

  const updateStatusMutation = trpc.support.adminUpdateStatus.useMutation({
    onSuccess() {
      ticketDetailQuery.refetch();
      ticketsQuery.refetch();
    },
  });

  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState("");

  const isAdmin =
    meQuery.data?.user && (meQuery.data.user as AdminUser).role === "admin";

  if (loading || meQuery.isLoading || ticketsQuery.isLoading) {
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
              Admin – Support
            </CardTitle>
            <CardDescription>
              You must be logged in as an admin to manage support tickets.
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

  const tickets = ticketsQuery.data ?? [];
  const selectedTicket = ticketDetailQuery.data?.ticket;
  const messages = ticketDetailQuery.data?.messages ?? [];

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;

    replyMutation.mutate({
      ticketId: selectedTicketId,
      message: replyMessage.trim(),
      newStatus: replyStatus ? (replyStatus as any) : undefined,
    } as any);
  };

  const handleStatusOnly = (status: string) => {
    if (!selectedTicketId) return;
    updateStatusMutation.mutate({
      ticketId: selectedTicketId,
      status: status as any,
    } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <LifeBuoy className="h-7 w-7" />
              Admin – Support tickets
            </h1>
            <p className="text-muted-foreground">
              Review and respond to user support tickets.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
          {/* Left: filters + list */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>
                  Filter tickets by status or category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="Deposits, Withdrawals, KYC..."
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => ticketsQuery.refetch()}
                    disabled={ticketsQuery.isFetching}
                  >
                    {ticketsQuery.isFetching && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
                <CardDescription>
                  Click a ticket to view the full conversation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ticketsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tickets match the current filters.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs md:text-sm">
                              #{t.id}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.userEmail || `#${t.userId}`}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {t.subject}
                            </TableCell>
                            <TableCell className="text-xs md:text-xs capitalize">
                              {t.status}
                            </TableCell>
                            <TableCell className="text-[11px] md:text-xs">
                              {t.updatedAt
                                ? new Date(t.updatedAt).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={
                                  selectedTicketId === t.id ? "default" : "outline"
                                }
                                onClick={() => setSelectedTicketId(t.id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: ticket detail */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Messages exchanged with the user for the selected ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTicketId ? (
                <p className="text-sm text-muted-foreground">
                  Select a ticket from the list to view and reply.
                </p>
              ) : ticketDetailQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : !selectedTicket ? (
                <p className="text-sm text-muted-foreground">
                  Ticket not found or you don&apos;t have access.
                </p>
              ) : (
                <>
                  <div className="space-y-1 border-b pb-3 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">
                          #{selectedTicket.id} – {selectedTicket.subject}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          User: {selectedTicket.userEmail || `#${selectedTicket.userId}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                          value={replyStatus || selectedTicket.status}
                          onChange={(e) => setReplyStatus(e.target.value)}
                        >
                          <option value="open">open</option>
                          <option value="pending">pending</option>
                          <option value="closed">closed</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusOnly(
                              replyStatus || selectedTicket.status || "open"
                            )
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          {updateStatusMutation.isPending && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          Set status
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {messages.map((m: any) => (
                      <div
                        key={m.id}
                        className={[
                          "rounded-md border px-3 py-2 text-xs md:text-sm",
                          m.authorRole === "user"
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium">
                            {m.authorRole === "user" ? "User" : "Admin"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.message}</div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No messages yet.
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleReply} className="space-y-2 pt-3 border-t">
                    <Label htmlFor="reply">Reply as admin</Label>
                    <Textarea
                      id="reply"
                      rows={3}
                      placeholder="Type your reply to the user..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={replyMutation.isPending || !replyMessage.trim()}
                      >
                        {replyMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Send reply
                      </Button>
                    </div>
                    {replyMutation.isError && (
                      <div className="mt-1 flex items-start gap-2 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>
                          {(replyMutation.error as any)?.message ||
                            "Failed to send reply. Please try again."}
                        </p>
                      </div>
                    )}
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
