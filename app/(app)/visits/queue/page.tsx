"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { VisitQueueScreen } from "@/components/visits/visit-queue-screen";

export default function ClinicQueuePage() {
  return (
    <RequirePermission anyOf={["visit:all", "appointment.readAll"]} redirectTo="/dashboard">
      <VisitQueueScreen mode="clinic" />
    </RequirePermission>
  );
}
