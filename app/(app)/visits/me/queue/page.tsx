"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { VisitQueueScreen } from "@/components/visits/visit-queue-screen";

export default function MyQueuePage() {
  return (
    <RequirePermission anyOf={["visit.read"]} redirectTo="/dashboard">
      <VisitQueueScreen mode="mine" />
    </RequirePermission>
  );
}
