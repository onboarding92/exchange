import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Users,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  role: string;
};

export default function AdminKyc() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const kycQuery = trpc.auth.adminListKycPending.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const reviewMutation = trpc.auth.adminReviewKyc.useMutation({
    onSuccess: () => {
      kycQuery.refetch();
    },
  });

  const [notes, setNotes] = useState<Record<number, string>>({});

  const isAdmin =
    meQuery.data?.user && (meQuery.data.user as AdminUser).role === "admin";

  if (loading || meQuery.isLoading || kycQuery.isLoading) {
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
              <ShieldCheck className="h-5 w-5" />
              Admin – KYC review
            </CardTitle>
            <CardDescription>
              You must be logged in as an admin to access KYC review.
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

  const submissions = kycQuery.data ?? [];

  const handleReview = (userId: number, status: "verified" | "rejected") => {
    const note = notes[userId] || "";
    reviewMutation.mutate({ userId, status, reviewNote: note || undefined });
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Users className="h-7 w-7" />
            Admin – KYC review
          </h1>
          <p className="text-muted-foreground">
            Review identity verification submissions and approve or reject them.
          </p>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No pending KYC</CardTitle>
              <CardDescription>
                There are currently no KYC submissions waiting for review.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub: any) => (
              <Card key={sub.userId}>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      {sub.email}
                    </CardTitle>
                    <CardDescription>
                      User ID: {sub.userId} – Current status:{" "}
                      <Badge variant="outline" className="ml-1">
                        {sub.status}
                      </Badge>
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Submitted documents
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {sub.documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="border border-border rounded-md px-3 py-2 bg-muted/40 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs md:text-sm">
                              {doc.type}
                            </span>
                            <Badge
                              variant={
                                doc.status === "pending" ? "outline" : "default"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground break-all">
                            fileKey: {doc.fileKey}
                          </div>
                          {doc.reviewNote && (
                            <div className="text-[11px] text-amber-500">
                              Note: {doc.reviewNote}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Review note (optional)
                    </label>
                    <Textarea
                      rows={2}
                      value={notes[sub.userId] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [sub.userId]: e.target.value,
                        }))
                      }
                      placeholder="Explain why this is approved or rejected..."
                      className="text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(sub.userId, "rejected")}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview(sub.userId, "verified")}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {kycQuery.isError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p>Failed to load KYC submissions. Please try again later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
