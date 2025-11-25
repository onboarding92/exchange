import { useEffect } from "react";
import { trpc } from "@/trpc";

export type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options: UseAuthOptions = {}) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath = "/",
  } = options;

  // Usa l endpoint auth.me del backend
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  const user = meQuery.data?.user ?? null;
  const isAuthenticated = !!user;
  const loading = meQuery.isLoading;

  // Se richiesto, fai redirect quando NON autenticato
  useEffect(() => {
    if (
      !loading &&
      redirectOnUnauthenticated &&
      !isAuthenticated &&
      redirectPath
    ) {
      window.location.href = redirectPath;
    }
  }, [loading, redirectOnUnauthenticated, isAuthenticated, redirectPath]);

  return {
    user,
    isAuthenticated,
    loading,
  };
}

export default useAuth;
