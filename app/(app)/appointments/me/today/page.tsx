"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { TodayAppointmentsScreen } from "@/components/appointments/today-appointments-screen";

export default function MyTodayAppointmentsPage() {
  return (
    <RequirePermission
      anyOf={["appointment.read"]}
      scope="PERSONAL"
      redirectTo="/dashboard"
    >
      <TodayAppointmentsScreen mode="mine" />
    </RequirePermission>
  );
}
