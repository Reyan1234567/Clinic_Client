"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { connectSocket, disconnectSocket } from "@/lib/socket";

/**
 * Opens the Socket.IO connection once the session is known, and tears it down
 * on logout / session expiry. Lives under AuthProvider for the whole app.
 */
export function SocketLifecycle() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      disconnectSocket();
      return;
    }

    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [user, loading]);

  return null;
}
