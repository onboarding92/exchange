import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, IdCard, FileText, Loader2, AlertCircle, Plus, Trash2, RefreshCcw } from "lucide-react";

type LocalDoc = {
  id: number;
  type: string;
  fileKey: string;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "verified") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-700">Verified</Badge>;
  }
  if (normalized === "pending") {
    return <Badge className="bg-amber-500 hover:bg-amber-600">Pending review</Badge>;
  }
  if (normalized === "rejected") {
    return <Badge className="bg-red-600 hover:bg-red-700">Rejected</Badge>;
  }
  return <Badge variant="outline">Unverified</Badge>;
}

export default function Kyc() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [docs, setDocs] = useState<LocalDoc[]>([
    { id: 1, type: "passport_front", fileKey: "" },
    { id: 2, type: "passport_back", fileKey: "" },
    { id: 3, type: "selfie_with_id", fileKey: "" },
  ]);

  const [nextId, setNextId] = useState(4);

  const kycQuery = trpc.auth.kycStatus.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const submitKyc = trpc.auth.submitKyc.useMutation({
    onSuccess: () => {
      kycQuery.refetch();
    },
  });

  if (loading || kycQuery.isLoading) {
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
              <ShieldCheck className="h-5 w-5" />
              KYC verification
            </CardTitle>
            <CardDescription>
              You need to be logged in to submit KYC documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Login to your account</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kyc = kycQuery.data ?? { status: "unverified", documents: [] as any[] };

  const handleAddDoc = () => {
    setDocs((prev) => [
      ...prev,
      {
        id: nextId,
        type: "",
        fileKey: "",
      },
    ]);
    setNextId((id) => id + 1);
  };

  const handleUpdateDoc = (id: number, field: "type" | "fileKey", value: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleRemoveDoc = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = () => {
    const cleanDocs = docs
      .map((d) => ({
        type: d.type.trim(),
        fileKey: d.fileKey.trim(),
      }))
      .filter((d) => d.type && d.fileKey);

    if (cleanDocs.length === 0) {
      alert("Please fill at least one document with a type and file key.");
      return;
    }

    submitKyc.mutate({ documents: cleanDocs });
  };

  const isSubmitting = submitKyc.isPending;

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <IdCard className="h-7 w-7" />
            KYC verification
          </h1>
          <p className="text-muted-foreground">
            Verify your identity to unlock full platform features (withdrawals, higher limits, etc.).
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: current status & history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Current status
              </CardTitle>
              <CardDescription>
                Your current verification level and latest submissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">KYC status</div>
                  <div className="text-xs text-muted-foreground">
                    This status is updated after an admin reviews your documents.
                  </div>
                </div>
                <StatusBadge status={kyc.status} />
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Submitted documents
                </div>
                {kyc.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No KYC submission on record for this account yet.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {kyc.documents.map((doc: any) => (
                      <li
                        key={doc.id}
                        className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs md:text-sm">{doc.type}</span>
                          <StatusBadge status={doc.status} />
                        </div>
                        <div className="text-[11px] text-muted-foreground break-all">
                          fileKey: {doc.fileKey}
                        </div>
                        {doc.reviewNote && (
                          <div className="text-[11px] text-amber-500">
                            Note: {doc.reviewNote}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => kycQuery.refetch()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh status
              </Button>

              {kyc.status === "rejected" && (
                <div className="flex items-start gap-2 text-xs text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>
                    Your last KYC submission was rejected. Please review the notes and submit
                    updated or clearer documents.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: submit new docs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submit KYC documents
              </CardTitle>
              <CardDescription>
                Enter the type and file key for each document you&apos;ve uploaded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Important:</strong> This form currently expects{" "}
                  <span className="font-mono">fileKey</span> values, not raw files. In a real
                  deployment you&apos;d first upload files (e.g. to S3 or another storage) and then
                  pass the resulting keys here.
                </p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-border rounded-md p-3 space-y-2 bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Document</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleRemoveDoc(doc.id)}
                        disabled={docs.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor={`type-${doc.id}`} className="text-xs">
                          Type (e.g. passport_front, id_card_back, selfie_with_id)
                        </Label>
                        <Input
                          id={`type-${doc.id}`}
                          value={doc.type}
                          onChange={(e) =>
                            handleUpdateDoc(doc.id, "type", e.target.value)
                          }
                          placeholder="passport_front"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`file-${doc.id}`} className="text-xs">
                          File key / path / ID
                        </Label>
                        <Input
                          id={`file-${doc.id}`}
                          value={doc.fileKey}
                          onChange={(e) =>
                            handleUpdateDoc(doc.id, "fileKey", e.target.value)
                          }
                          placeholder="s3://bucket/kyc/user123/passport_front.jpg"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDoc}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add document
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Submit KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
