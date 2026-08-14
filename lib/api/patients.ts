import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
} from "@/lib/api/client";
import type { Gender, Patient } from "@/lib/types";

export interface PatientListParams {
  page?: number;
  /** This endpoint takes `pageSize` but returns `limit` in meta. */
  pageSize?: number;
  search?: string;
}

export interface PatientInput {
  fullName: string;
  phone: string;
  gender: Gender;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  address: string;
}

/** GET /patients — requires `patient.read`. Archived patients are excluded. */
export function listPatients(params: PatientListParams = {}) {
  return requestPage<Patient>(`/patients${buildQuery({ ...params })}`);
}

/** GET /patients/:id — requires `patient.read`. 404 if missing or archived. */
export function getPatient(id: number) {
  return requestData<Patient>(`/patients/${id}`);
}

/** POST /patients — requires `patient.create`. `patientNumber` is server-generated. */
export function createPatient(input: PatientInput) {
  return requestData<Patient>("/patients", { method: "POST", ...json(input) });
}

/** PATCH /patients/:id — requires `patient.update`. */
export function updatePatient(id: number, input: Partial<PatientInput>) {
  return requestData<Patient>(`/patients/${id}`, { method: "PATCH", ...json(input) });
}

/** PATCH /patients/:id/archive — requires `patient.archive`. */
export function archivePatient(id: number) {
  return requestData<Patient>(`/patients/${id}/archive`, { method: "PATCH" });
}

/**
 * DELETE /patients/:id — requires `patient.delete`.
 * 409 when the patient has appointments or invoices; the server message tells
 * the user to archive instead, so surface it verbatim.
 */
export function deletePatient(id: number) {
  return requestMessage(`/patients/${id}`, { method: "DELETE" });
}
