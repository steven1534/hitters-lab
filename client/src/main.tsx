import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import "./styles/mobile-optimizations.css";
import { SiteContentProvider } from "@/contexts/SiteContentContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One retry is enough to survive a momentary server hiccup.
      // retryDelay: 1 s — fast enough to be invisible, slow enough not to spam.
      retry: 1,
      retryDelay: 1000,
      // 30 s staleTime prevents the same data from being re-fetched every time
      // a component remounts, eliminating unnecessary loading flickers.
      staleTime: 30_000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const res = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        // Guard against HTML responses (e.g., Vite SPA fallback on server restart)
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok && contentType.includes("text/html")) {
          throw new Error(
            "Server temporarily unavailable. Please try again in a moment."
          );
        }
        return res;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <SiteContentProvider>
        <App />
      </SiteContentProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
