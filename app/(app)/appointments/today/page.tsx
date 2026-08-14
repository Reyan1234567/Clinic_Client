"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { TodayAppointmentsScreen } from "@/components/appointments/today-appointments-screen";

export default function TodayAppointmentsPage() {
  return (
    <RequirePermission anyOf={["appointment.readAll"]} redirectTo="/appointments/me/today">
      <TodayAppointmentsScreen mode="clinic" />
    </RequirePermission>
  );
}
