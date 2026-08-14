import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
} from "@/lib/api/client";
import type {
  PlanItem,
  PlanItemStatus,
  PlannedTodayPlanItem,
  TreatmentPlan,
  TreatmentPlanDetail,
  TreatmentPlanStatus,
  TreatmentPlanWithPatient,
} from "@/lib/types";

export interface TreatmentPlanListParams {
  search?: string;
  status?: TreatmentPlanStatus;
  page?: number;
  limit?: number;
}

/** GET /treatment-plans — requires GLOBAL `treatmentPlan.read`. */
export function listTreatmentPlans(params: TreatmentPlanListParams = {}) {
  return requestPage<TreatmentPlanWithPatient>(`/treatment-plans${buildQuery({ ...params })}`);
}

/** GET /treatment-plans/me — requires PERSONAL (or GLOBAL) `treatmentPlan.read`. */
export function listMyTreatmentPlans(params: TreatmentPlanListParams = {}) {
  return requestPage<TreatmentPlanWithPatient>(
    `/treatment-plans/me${buildQuery({ ...params })}`,
  );
}

/** GET /treatment-plans/items/planned-today — GLOBAL `treatmentPlan.read`. */
export function listPlannedTodayItems() {
  return requestData<PlannedTodayPlanItem[]>("/treatment-plans/items/planned-today");
}

/** GET /treatment-plans/items/planned-today/me — PERSONAL `treatmentPlan.read`. */
export function listMyPlannedTodayItems() {
  return requestData<PlannedTodayPlanItem[]>(
    "/treatment-plans/items/planned-today/me",
  );
}

/** GET /treatment-plans/:treatmentPlanId — requires `treatmentPlan.read`. */
export function getTreatmentPlan(treatmentPlanId: string) {
  return requestData<TreatmentPlanDetail>(`/treatment-plans/${treatmentPlanId}`);
}

/** POST /treatment-plans/:patientId — requires `treatmentPlan.create`. */
export function createTreatmentPlan(
  patientId: number,
  input: { title?: string; description?: string },
) {
  return requestData<TreatmentPlan>(`/treatment-plans/${patientId}`, {
    method: "POST",
    ...json(input),
  });
}

/** PATCH /treatment-plans/:treatmentPlanId — requires `treatmentPlan.update`. */
export function updateTreatmentPlan(
  treatmentPlanId: string,
  input: { title?: string; description?: string },
) {
  return requestData<TreatmentPlan>(`/treatment-plans/${treatmentPlanId}`, {
    method: "PATCH",
    ...json(input),
  });
}

/** PATCH /treatment-plans/:treatmentPlanId/status — requires `treatmentPlan.update`. */
export function setTreatmentPlanStatus(treatmentPlanId: string, status: TreatmentPlanStatus) {
  return requestData<TreatmentPlan>(`/treatment-plans/${treatmentPlanId}/status`, {
    method: "PATCH",
    ...json({ status }),
  });
}

/**
 * DELETE /treatment-plans/:treatmentPlanId — requires `treatmentPlan.update`,
 * not `treatmentPlan.delete`. The server checks the update permission here.
 */
export function deleteTreatmentPlan(treatmentPlanId: string) {
  return requestMessage(`/treatment-plans/${treatmentPlanId}`, { method: "DELETE" });
}

/** POST /treatment-plans/:treatmentPlanId/items — requires `treatmentPlan.create`. */
export function createPlanItem(
  treatmentPlanId: string,
  input: { title: string; dentistId?: string; notes?: string; plannedDate?: string },
) {
  return requestData<PlanItem>(`/treatment-plans/${treatmentPlanId}/items`, {
    method: "POST",
    ...json(input),
  });
}

/**
 * PATCH /treatment-plans/items/:itemId — requires `treatmentPlan.delete`,
 * not `treatmentPlan.update`. That is what the server authorises against.
 */
export function updatePlanItem(
  itemId: string,
  input: {
    title?: string;
    dentistId?: string;
    notes?: string;
    plannedDate?: string;
  },
) {
  return requestData<PlanItem>(`/treatment-plans/items/${itemId}`, {
    method: "PATCH",
    ...json(input),
  });
}

/** DELETE /treatment-plans/items/:itemId — requires `treatmentPlan.delete`. */
export function deletePlanItem(itemId: string) {
  return requestMessage(`/treatment-plans/items/${itemId}`, { method: "DELETE" });
}

/** PATCH /treatment-plans/items/:itemId/status — requires `treatmentPlan.update`. */
export function setPlanItemStatus(itemId: string, status: PlanItemStatus) {
  return requestData<PlanItem>(`/treatment-plans/items/${itemId}/status`, {
    method: "PATCH",
    ...json({ status }),
  });
}
