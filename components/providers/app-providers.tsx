"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppointmentRealtime } from "@/components/providers/appointment-realtime";
import { BillingRealtime } from "@/components/providers/billing-realtime";
import { SocketLifecycle } from "@/components/providers/socket-lifecycle";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <SocketLifecycle />
        <AppointmentRealtime />
        <BillingRealtime />
        {children}
        <Toaster position="top-right" offset={16} gap={10} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
