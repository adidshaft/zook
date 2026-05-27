"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            toast:
              "zook-focus border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-lg)]",
            title: "text-[var(--text-primary)]",
            description: "text-[var(--text-secondary)]",
            closeButton:
              "zook-focus border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]",
          },
        }}
      />
    </QueryClientProvider>
  );
}
