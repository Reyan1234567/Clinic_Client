import { json, requestData, requestMessage } from "@/lib/api/client";
import type { PlannedProcedure } from "@/lib/types";

export interface PlannedProcedureInput {
  title: string;
  description?: string;
  /** Omit or null for a custom procedure (requires estimatedPrice). */
  treatmentCatalogId?: string | null;
  /** Sent as a number even though it comes back as a decimal string. Required when custom. */
  estimatedPrice?: number;
  notes?: string;
}

/**
 * POST /plan-procedures/:treatmentPlanItemId/procedure — requires
 * `treatmentPlan.create`.
 */
export function createPlannedProcedure(
  treatmentPlanItemId: string,
  input: PlannedProcedureInput,
) {
  return requestData<PlannedProcedure>(
    `/plan-procedures/${treatmentPlanItemId}/procedure`,
    { method: "POST", ...json(input) },
  );
}

/** PATCH /plan-procedures/:plannedProcedureId — requires `treatmentPlan.update`. */
export function updatePlannedProcedure(
  plannedProcedureId: string,
  input: Partial<PlannedProcedureInput>,
) {
  return requestData<PlannedProcedure>(`/plan-procedures/${plannedProcedureId}`, {
    method: "PATCH",
    ...json(input),
  });
}

/** DELETE /plan-procedures/:plannedProcedureId — requires `treatmentPlan.delete`. */
export function deletePlannedProcedure(plannedProcedureId: string) {
  return requestMessage(`/plan-procedures/${plannedProcedureId}`, { method: "DELETE" });
}
