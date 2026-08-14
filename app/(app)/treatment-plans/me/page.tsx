"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { TreatmentPlansList } from "@/components/treatment-plans/treatment-plans-list";

export default function MyTreatmentPlansPage() {
  return (
    <RequirePermission
      anyOf={["treatmentPlan.read"]}
      scope="PERSONAL"
      redirectTo="/treatment-plans"
    >
      <TreatmentPlansList mode="mine" />
    </RequirePermission>
  );
}
