"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { TreatmentPlansList } from "@/components/treatment-plans/treatment-plans-list";

export default function AllTreatmentPlansPage() {
  return (
    <RequirePermission
      anyOf={["treatmentPlan.read"]}
      scope="GLOBAL"
      redirectTo="/treatment-plans/me"
    >
      <TreatmentPlansList mode="all" />
    </RequirePermission>
  );
}
