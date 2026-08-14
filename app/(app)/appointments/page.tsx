"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { AppointmentsCalendarScreen } from "@/components/appointments/appointments-calendar-screen";

export default function AppointmentsPage() {
  return (
    <RequirePermission anyOf={["appointment.readAll"]} redirectTo="/appointments/me">
      <AppointmentsCalendarScreen mode="clinic" />
    </RequirePermission>
  );
}
