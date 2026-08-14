"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  showCheckedInToast,
  type AppointmentCheckedInPayload,
} from "@/components/appointments/checked-in-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { useSocketEvent } from "@/lib/hooks/use-socket-event";
import { connectSocket, getSocket } from "@/lib/socket";
import { queryKeys } from "@/lib/query-keys";

export type { AppointmentCheckedInPayload };

/**
 * Listens for reception check-ins delivered to this user's socket rooms and
 * refreshes appointment queries. Mounted once under AppProviders.
 */
export function AppointmentRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Ensure we are connected whenever a session is present (covers remounts).
  useEffect(() => {
    if (!user) return;
    connectSocket();
    const s = getSocket();
    const onConnect = () => {
      // no-op: useSocketEvent already binds the checked-in listener
    };
    s.on("connect", onConnect);
    return () => {
      s.off("connect", onConnect);
    };
  }, [user]);

  useSocketEvent<AppointmentCheckedInPayload>("appointment.checked_in", (payload) => {
    // Ignore events for other dentists if the payload somehow lands here.
    if (user?.id && payload.dentistId && payload.dentistId !== user.id) {
      return;
    }

    showCheckedInToast(payload);
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["visits"] });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointment(payload.appointmentId),
    });
  });

  return null;
}
