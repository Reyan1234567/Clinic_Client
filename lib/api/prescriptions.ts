import { json, requestData, requestMessage } from "@/lib/api/client";
import type { PatientVisit, Prescription } from "@/lib/types";

/**
 * POST /prescriptions/:visitId/prescription — requires `prescription.create`.
 * Returns the whole visit with its prescriptions, not just the new row.
 * 403 once the parent visit is finished.
 */
export function createPrescription(
  visitId: string,
  input: { medicine: string; dosage: string },
) {
  return requestData<PatientVisit & { prescriptions: Prescription[] }>(
    `/prescriptions/${visitId}/prescription`,
    { method: "POST", ...json(input) },
  );
}

/** PATCH /prescriptions/:prescriptionId — requires `prescription.update`. */
export function updatePrescription(
  prescriptionId: string,
  input: { medicine?: string; dosage?: string },
) {
  return requestData<Prescription>(`/prescriptions/${prescriptionId}`, {
    method: "PATCH",
    ...json(input),
  });
}

/** DELETE /prescriptions/:prescriptionId — requires `prescription.delete`. */
export function deletePrescription(prescriptionId: string) {
  return requestMessage(`/prescriptions/${prescriptionId}`, { method: "DELETE" });
}
