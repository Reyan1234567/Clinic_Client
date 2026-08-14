"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { AppointmentsCalendarScreen } from "@/components/appointments/appointments-calendar-screen";

export default function MyAppointmentsPage() {
  return (
    <RequirePermission
      anyOf={["appointment.read"]}
      scope="PERSONAL"
      redirectTo="/dashboard"
    >
      <AppointmentsCalendarScreen mode="mine" />
    </RequirePermission>
  );
}
