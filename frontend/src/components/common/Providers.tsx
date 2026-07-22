"use client";

/**
 * Helix — Global Providers
 * Wraps the app with TanStack Query, theme, and toast providers.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { CommandPalette } from "@/components/common/CommandPalette";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            gcTime: 1000 * 60 * 10,   // 10 minutes cache
            retry: (failureCount, error: any) => {
              if ([401, 403, 404].includes(error?.status)) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        {children}
        <CommandPalette />
        <CreateIssueModal />
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
