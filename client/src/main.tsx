import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { initializeVersionCheck, startPeriodicVersionCheck } from "@/lib/versionCheck";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { ClerkProvider } from '@clerk/clerk-react';
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

// Check if current path is a demo route that doesn't require authentication
const isDemoRoute = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  // Check for demo routes: /demo, /demo/*, /project/1, /project/1/*
  const isDemoPath = path === '/demo' || 
                     path.startsWith('/demo/') || 
                     path === '/project/1' || 
                     path.startsWith('/project/1/');
  return isDemoPath;
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Don't redirect if accessing demo routes - they allow unauthenticated access
  if (isDemoRoute()) {
    return;
  }

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    // Skip redirect logic entirely for demo routes
    if (isDemoRoute()) return;
    
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    // Skip redirect logic entirely for demo routes
    if (isDemoRoute()) return;
    
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
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Initialize version checking on app load
// This ensures the app always uses the latest deployed version
initializeVersionCheck();
startPeriodicVersionCheck();

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </ClerkProvider>
);
