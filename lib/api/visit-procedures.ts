import { json, requestData, requestMessage } from "@/lib/api/client";
import type { FilePurpose, ProcedureFile, VisitProcedure } from "@/lib/types";

/**
 * POST /visit-procedures/from-visit/:visitId — requires `procedure.create`.
 * Defaults to SUCCEEDED when status is omitted.
 */
export function createProcedureFromVisit(
  visitId: string,
  input: {
    title: string;
    status?: "PENDING" | "SUCCEEDED" | "FAILED";
    treatmentCatalogId?: string;
    description?: string;
    estimatedPrice?: number;
    notes?: string;
  },
) {
  return requestData<VisitProcedure>(`/visit-procedures/from-visit/${visitId}`, {
    method: "POST",
    ...json(input),
  });
}

/**
 * POST /visit-procedures/image/:procedureId — requires `procedure.attachImage`.
 * 403 if the caller did not upload that file.
 */
export function attachImageToProcedure(
  procedureId: string,
  input: { fileId: string; purpose: FilePurpose; description?: string },
) {
  return requestData<ProcedureFile>(`/visit-procedures/image/${procedureId}`, {
    method: "POST",
    ...json(input),
  });
}

/** DELETE /visit-procedures/:procedureId/files/:fileId — requires `procedure.attachImage`. */
export function detachImageFromProcedure(procedureId: string, fileId: string) {
  return requestMessage(`/visit-procedures/${procedureId}/files/${fileId}`, {
    method: "DELETE",
  });
}

/** DELETE /visit-procedures/:procedureId — requires `procedure.delete`. */
export function deleteProcedure(procedureId: string) {
  return requestMessage(`/visit-procedures/${procedureId}`, { method: "DELETE" });
}

/** PATCH /visit-procedures/:procedureId/status — requires `visit.update`. */
export function setProcedureStatus(
  procedureId: string,
  status: "SUCCEEDED" | "FAILED",
) {
  return requestData<VisitProcedure>(`/visit-procedures/${procedureId}/status`, {
    method: "PATCH",
    ...json({ status }),
  });
}

/** PATCH /visit-procedures/:procedureId/finish — requires `visit-procedure.setFinished`. */
export function finishProcedure(procedureId: string) {
  return requestData<VisitProcedure>(`/visit-procedures/${procedureId}/finish`, {
    method: "PATCH",
  });
}

/** PATCH /visit-procedures/:procedureId/rollback — requires `procedure.rollbackFinished`. */
export function rollbackProcedure(procedureId: string) {
  return requestData<VisitProcedure>(`/visit-procedures/${procedureId}/rollback`, {
    method: "PATCH",
  });
}
