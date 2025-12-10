import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./trpc";
import App from "./App";
import { NotificationProvider } from "./notifications";

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "/trpc",
      /**
       * Important: always send session cookies with tRPC calls.
       */
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      async onError({ error }) {
        const status = error?.data?.httpStatus;
        if (status === 401 || status === 403) {
          // Session expired / unauthorized -> force logout on client
          try {
            localStorage.removeItem("authToken");
          } catch {
            // ignore storage errors
          }
          console.warn("[auth] Session expired or unauthorized, redirecting to /login");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      },
    }),
  ],
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);

root.render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
