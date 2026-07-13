"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemedToaster } from "@/components/themed-toaster";
import { useState } from "react";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2, // exponential backoff built in — resilient on flaky networks
            refetchOnWindowFocus: false,
            refetchOnReconnect: true, // resync automatically when back online
          },
          mutations: { retry: 1 },
        },
      })
  );

  return (
    // Server-provided session = no auth-state flicker, correct UI on first paint.
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <ThemedToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
