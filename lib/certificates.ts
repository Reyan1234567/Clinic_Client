import { todayKey, toDateKey } from "@/lib/format";
import type {
  BiopsyRequestData,
  CertificateType,
  MedicalCertificateData,
  ReferralFormData,
  VisitDetail,
} from "@/lib/types";

export const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  BIOPSY_REQUEST: "Biopsy examination request",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  REFERRAL_FORM: "Referral form",
};

function joinNotes(...parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("\n\n");
}

function daysInclusiveLabel(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "1 Day";
  }
  const days = Math.round((end - start) / 86_400_000) + 1;
  return `${days} Day${days === 1 ? "" : "s"}`;
}

export function defaultBiopsyData(visit: VisitDetail): BiopsyRequestData {
  return {
    requestingDoctorName: visit.dentist.fullName,
    requestingDoctorPhone: visit.dentist.phone,
    history: visit.chiefComplaint?.trim() || "",
    clinicalAppearance: visit.clinicalFindings?.trim() || "",
    lesionLocation: "",
    biopsyType: "INCISIONAL",
    biopsyDate: todayKey(),
    clinicalImpression: visit.diagnosis?.trim() || "",
  };
}

export function defaultMedicalCertificateData(
  visit: VisitDetail,
): MedicalCertificateData {
  const treatedFrom = visit.startedAt ? toDateKey(visit.startedAt) : todayKey();
  const treatedTo = todayKey();
  const to = treatedTo < treatedFrom ? treatedFrom : treatedTo;
  return {
    diagnosis: visit.diagnosis?.trim() || visit.chiefComplaint?.trim() || "",
    treatedFrom,
    treatedTo: to,
    restRequiredDays: daysInclusiveLabel(treatedFrom, to),
    remark: "",
  };
}

export function defaultReferralData(visit: VisitDetail): ReferralFormData {
  return {
    historyExamInvestigation: joinNotes(
      visit.chiefComplaint,
      visit.clinicalFindings,
    ),
    diagnosticImpression: visit.diagnosis?.trim() || "",
    treatmentGiven: visit.notes?.trim() || "",
    reasonForReferral: "",
    feedback: "",
  };
}

export function defaultCertificateData(type: CertificateType, visit: VisitDetail) {
  if (type === "BIOPSY_REQUEST") return defaultBiopsyData(visit);
  if (type === "MEDICAL_CERTIFICATE") return defaultMedicalCertificateData(visit);
  return defaultReferralData(visit);
}
