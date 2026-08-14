import { formatAgeDetail, formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

type PatientLike = {
  fullName: string;
  patientNumber: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
};

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-[var(--clinical-border)] bg-[var(--clinical-strip)] px-2.5 py-1.5">
      <p className="clinical-label">{label}</p>
      <p className="truncate text-sm text-[var(--clinical-fg)]">{value || "—"}</p>
    </div>
  );
}

/** Demographics strip above chart / order content. */
export function PatientDemographicsStrip({
  patient,
  extra,
  className,
}: {
  patient: PatientLike;
  extra?: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  const ageDetail = formatAgeDetail(patient.dateOfBirth);
  return (
    <div
      className={cn(
        "grid gap-0 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6",
        className,
      )}
    >
      <Cell label="Name" value={patient.fullName} />
      <Cell label="Patient #" value={patient.patientNumber} />
      <Cell label="Mobile" value={patient.phone} />
      <Cell
        label="Sex / Age"
        value={`${patient.gender === "MALE" ? "Male" : "Female"} · ${ageDetail}`}
      />
      <Cell label="DOB" value={formatDateOnly(patient.dateOfBirth)} />
      {(extra ?? []).map((item) => (
        <Cell key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
