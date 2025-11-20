import { useState } from "react";
import { UserNav } from "@/components/UserNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, QrCode, Lock, Unlock, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Security() {
  const { isAuthenticated, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const init2FA = trpc.auth.init2FASetup.useMutation({
    onSuccess: (data) => {
      setSetupSecret(data.secret);
      setSetupUrl(data.otpauthUrl);
      toast.success("2FA setup started. Scan the QR code with your authenticator app.");
    },
    onError: (err) => {
      if (err.message.includes("already enabled")) {
        toast.info("Two-factor authentication is already enabled on this account.");
      } else {
        toast.error(err.message || "Failed to start 2FA setup.");
      }
    },
  });

  const confirm2FA = trpc.auth.confirm2FASetup.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication enabled successfully.");
      setSetupCode("");
      setSetupSecret(null);
      setSetupUrl(null);
    },
    onError: (err) => {
      toast.error(err.message || "Invalid 2FA code. Please try again.");
    },
  });

  const disable2FA = trpc.auth.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication has been disabled.");
      setDisableCode("");
    },
    onError: (err) => {
      if (err.message.includes("not enabled")) {
        toast.info("Two-factor authentication is not enabled on this account.");
      } else {
        toast.error(err.message || "Failed to disable 2FA.");
      }
    },
  });

  if (authLoading || !isAuthenticated) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              You need to be logged in to manage two-factor authentication.
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

  const qrUrl = setupUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        setupUrl
      )}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <UserNav />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Security</h1>
          <p className="text-muted-foreground">
            Manage two-factor authentication (2FA) for your account.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security for sign-in and withdrawals.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                We recommend enabling 2FA using an authenticator app (Google Authenticator, Authy, etc.).
                You&apos;ll need to enter a 6-digit code from your app each time you log in or confirm withdrawals.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    <h2 className="font-semibold">Step 1: Start setup</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to generate a unique secret and QR code. Scan it with your authenticator app.
                  </p>
                  <Button
                    variant="default"
                    onClick={() => init2FA.mutate()}
                    disabled={init2FA.isPending}
                  >
                    {init2FA.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Start 2FA setup
                  </Button>

                  {setupSecret && (
                    <div className="mt-4 space-y-3">
                      {qrUrl && (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={qrUrl}
                            alt="2FA QR Code"
                            className="border rounded-md p-2 bg-background"
                          />
                          <span className="text-xs text-muted-foreground">
                            Scan this QR with your authenticator app
                          </span>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs uppercase text-muted-foreground">
                          Secret key (backup)
                        </Label>
                        <div className="mt-1 font-mono text-sm break-all bg-muted rounded-md px-2 py-1">
                          {setupSecret}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    <h2 className="font-semibold">Step 2: Confirm code</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    After scanning, enter the 6-digit code from your authenticator app to confirm and enable 2FA.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="setup-code">Authenticator code</Label>
                    <Input
                      id="setup-code"
                      placeholder="123456"
                      maxLength={8}
                      value={setupCode}
                      onChange={(e) => setSetupCode(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!setupCode) {
                        toast.error("Please enter the code from your authenticator app.");
                        return;
                      }
                      confirm2FA.mutate({ token: setupCode });
                    }}
                    disabled={confirm2FA.isPending}
                  >
                    {confirm2FA.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Confirm &amp; enable 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5" />
                Disable 2FA
              </CardTitle>
              <CardDescription>
                If you lose access to your authenticator app, contact support rather than disabling 2FA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To disable 2FA, enter a valid code from your authenticator app and confirm.
              </p>
              <div className="space-y-2">
                <Label htmlFor="disable-code">Authenticator code</Label>
                <Input
                  id="disable-code"
                  placeholder="123456"
                  maxLength={8}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (!disableCode) {
                    toast.error("Please enter a 2FA code to disable two-factor authentication.");
                    return;
                  }
                  disable2FA.mutate({ token: disableCode });
                }}
                disabled={disable2FA.isPending}
              >
                {disable2FA.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Disable 2FA
              </Button>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>
                  For maximum security, keep 2FA enabled. Only disable it if you are migrating to a new device and
                  immediately re-enable it afterwards.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
