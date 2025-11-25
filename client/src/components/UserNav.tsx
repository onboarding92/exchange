import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

/**
 * Top navigation bar shown on most authenticated pages
 * (Deposit, Kyc, Admin*, etc.).
 *
 * In the original source, many pages import:
 *   import { UserNav } from "@/components/UserNav";
 *
 * but the component file was missing.
 */
export const UserNav: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Dopo il logout, porta al login
      window.location.href = getLoginUrl();
    },
  });

  const handleLogout = () => {
    if (logoutMutation.isLoading) return;
    logoutMutation.mutate();
  };

  return (
    <header className="border-b bg-background">
      <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <a className="flex items-center gap-2 font-semibold">
            <span className="text-primary">BitChange</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Exchange
            </span>
          </a>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-muted-foreground">Loading...</span>
          ) : isAuthenticated && user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded border border-border hover:bg-muted"
                disabled={logoutMutation.isLoading}
              >
                {logoutMutation.isLoading ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <Link href={getLoginUrl()}>
              <a className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                Log in
              </a>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default UserNav;
