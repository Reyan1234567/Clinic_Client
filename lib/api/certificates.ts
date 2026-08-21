import { json, requestData, requestMessage } from "@/lib/api/client";
import type {
  CertificateData,
  CertificateType,
  MedicalCertificate,
} from "@/lib/types";

export function listVisitCertificates(visitId: string) {
  return requestData<MedicalCertificate[]>(`/visits/${visitId}/certificates`);
}

export function createVisitCertificate(
  visitId: string,
  input: { type: CertificateType; data: CertificateData },
) {
  return requestData<MedicalCertificate>(`/visits/${visitId}/certificates`, {
    method: "POST",
    ...json(input),
  });
}

export function updateCertificate(id: string, data: CertificateData) {
  return requestData<MedicalCertificate>(`/certificates/${id}`, {
    method: "PATCH",
    ...json({ data }),
  });
}

export function deleteCertificate(id: string) {
  return requestMessage(`/certificates/${id}`, { method: "DELETE" });
}
