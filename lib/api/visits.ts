import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
  requestRaw,
  requestVoid,
} from "@/lib/api/client";
import type {
  AttachedFile,
  FilePurpose,
  Page,
  PatientVisit,
  TodayQueue,
  VisitCreated,
  VisitDetail,
  VisitInvoiceSummary,
  VisitListItem,
  VisitListItemFull,
} from "@/lib/types";

/** The server filters procedure status with lowercase values on these lists. */
export type VisitListStatusFilter = "pending" | "succeeded" | "failed";

export interface MyVisitsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VisitListStatusFilter;
  days?: number;
}

export interface PatientVisitsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VisitListStatusFilter;
}

export interface VisitInput {
  title?: string;
  chiefComplaint?: string;
  clinicalFindings?: string;
  diagnosis?: string;
  notes?: string;
}

/**
 * GET /visits/me — requires `visit.read`.
 * This endpoint replies WITHOUT the success envelope, so it is read raw and
 * normalised here instead of leaking the inconsistency into callers.
 */
export async function listMyVisits(params: MyVisitsParams = {}) {
  const result = await requestRaw<Page<VisitListItem>>(
    `/visits/me${buildQuery({ ...params })}`,
  );

  return {
    data: result?.data ?? [],
    meta:
      result?.meta ?? {
        totalCount: result?.data?.length ?? 0,
        page: 1,
        limit: result?.data?.length ?? 0,
        totalPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
  } satisfies Page<VisitListItem>;
}

/** GET /visits/patients — requires `visit:all`. */
export function listPatientVisits(params: PatientVisitsParams = {}) {
  return requestPage<VisitListItemFull>(`/visits/patients${buildQuery({ ...params })}`);
}

/** GET /visits/for-patient/:patientId — requires `patient.read`. */
export function listVisitsForPatient(
  patientId: number,
  params: { page?: number; limit?: number } = {},
) {
  return requestPage<VisitListItemFull>(
    `/visits/for-patient/${patientId}${buildQuery({ ...params })}`,
  );
}

/** GET /visits/for-patient/:patientId/:visitId — requires `patient.read`. */
export function getPatientVisitHistory(patientId: number, visitId: string) {
  return requestData<VisitDetail>(`/visits/for-patient/${patientId}/${visitId}`);
}

/** GET /visits/:id — requires `visit.read`. Drives the whole clinical screen. */
export function getVisit(id: string) {
  return requestData<VisitDetail>(`/visits/${id}`);
}

/** GET /visits/queue/today — clinic floor. Reception or GLOBAL visit read. */
export function getTodayQueue() {
  return requestData<TodayQueue>("/visits/queue/today");
}

/** GET /visits/me/queue/today — this dentist's floor. */
export function getMyTodayQueue() {
  return requestData<TodayQueue>("/visits/me/queue/today");
}

/** POST /visits/walk-in — waiting visit, no appointment. */
export function createWalkInVisit(input: {
  patientId: number;
  dentistId: string;
  title?: string;
}) {
  return requestData<PatientVisit>("/visits/walk-in", {
    method: "POST",
    ...json(input),
  });
}

/** PATCH /visits/:id/start — WAITING → OPEN. */
export function startVisit(id: string) {
  return requestData<PatientVisit>(`/visits/${id}/start`, { method: "PATCH" });
}

/** POST /visits/patient/:patientId — requires `visit.create`. Dentist is the caller. */
export function createVisit(patientId: number, input: VisitInput) {
  return requestData<VisitCreated>(`/visits/patient/${patientId}`, {
    method: "POST",
    ...json(input),
  });
}

/**
 * POST /visits/from-item/:treatmentPlanItemId — requires `visit.create` and
 * `procedure.create`. Copies the item's PLANNED procedures onto the new visit.
 */
export function createVisitFromPlanItem(treatmentPlanItemId: string, input: VisitInput = {}) {
  return requestData<VisitDetail>(`/visits/from-item/${treatmentPlanItemId}`, {
    method: "POST",
    ...json(input),
  });
}

/**
 * POST /visits/:visitId/procedure — requires `procedure.attach`.
 * `treatmentCatalogId` is mandatory here and `status` is lowercase. Defaults
 * to pending. Returns the bare visit row without procedures, so refetch the
 * visit detail afterwards. Files the caller did not upload are silently
 * skipped, not rejected.
 */
export function attachProcedureToVisit(
  visitId: string,
  input: {
    treatmentCatalogId: string;
    title: string;
    status?: "pending" | "succeeded" | "failed";
    description?: string;
    estimatedPrice?: number;
    notes?: string;
    files?: { fileId: string; purpose: FilePurpose; description?: string }[];
  },
) {
  return requestData<PatientVisit>(`/visits/${visitId}/procedure`, {
    method: "POST",
    ...json(input),
  });
}

/** PATCH /visits/:id — requires `visit.update`. */
export function updateVisit(id: string, input: VisitInput) {
  return requestData<PatientVisit>(`/visits/${id}`, { method: "PATCH", ...json(input) });
}

/**
 * PATCH /visits/:id/finish — requires `visit.setFinished`.
 * Child procedures are stamped finished too. Prescription writes 403 after
 * this, so hide those controls once `finishedAt` is set.
 */
export function finishVisit(id: string) {
  return requestData<PatientVisit & { invoice?: VisitInvoiceSummary | null }>(
    `/visits/${id}/finish`,
    { method: "PATCH" },
  );
}

/** PATCH /visits/:id/rollback — requires `visit.rollbackFinished`. */
export function rollbackVisit(visitId: string) {
  return requestData<PatientVisit>(`/visits/${visitId}/rollback`, { method: "PATCH" });
}

/** DELETE /visits/:id — requires `visit.delete`. */
export function deleteVisit(id: string) {
  return requestMessage(`/visits/${id}`, { method: "DELETE" });
}

/** POST /visits/:visitId/files — requires `visit.attachImage`. Upload first. */
export function attachFileToVisit(
  visitId: string,
  input: { fileId: string; purpose: FilePurpose; description?: string },
) {
  return requestData<AttachedFile>(`/visits/${visitId}/files`, {
    method: "POST",
    ...json(input),
  });
}

/** DELETE /visits/:visitId/files/:fileId — requires `visit.delete`. 204, empty body. */
export function detachFileFromVisit(visitId: string, fileId: string) {
  return requestVoid(`/visits/${visitId}/files/${fileId}`, { method: "DELETE" });
}
