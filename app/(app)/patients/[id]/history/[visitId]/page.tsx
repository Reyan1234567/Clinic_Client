"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { ClinicalSurface } from "@/components/clinical/clinical-surface";
import { PatientDemographicsStrip } from "@/components/clinical/patient-demographics-strip";
import { AuthImage } from "@/components/files/auth-image";
import { DataPoint } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  ProcedureStatusBadge,
  VisitStateBadge,
} from "@/components/ui/status-badge";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import * as visitsApi from "@/lib/api/visits";
import {
  formatBytes,
  formatDateOnly,
  formatDateTime,
  formatEnum,
  formatMoney,
  formatTime,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { VisitDetail, VisitProcedureStatus } from "@/lib/types";

export default function PatientVisitHistoryDetailPage() {
  return (
    <RequirePermission anyOf={["patient.read"]} redirectTo="/dashboard">
      <PatientVisitHistoryDetailScreen />
    </RequirePermission>
  );
}

function PatientVisitHistoryDetailScreen() {
  const params = useParams<{ id: string; visitId: string }>();
  const patientId = Number(params.id);
  const visitId = params.visitId;

  const query = useQuery({
    queryKey: queryKeys.patientVisitHistory(patientId, visitId),
    queryFn: () => visitsApi.getPatientVisitHistory(patientId, visitId),
    enabled: Number.isFinite(patientId) && Boolean(visitId),
  });

  if (query.isPending) return <FullPageSpinner label="Loading visit history" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const visit = query.data;

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow={`History / ${formatDateOnly(visit.createdAt)}`}
        title={visit.title || visit.patient.fullName}
        description="Read-only visit record from patient history"
      >
        <VisitStateBadge finishedAt={visit.finishedAt} status={visit.status} />
        <Link
          href={`/patients/${visit.patient.id}`}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
        >
          All history
        </Link>
        <Can permission="visit.read">
          <Link
            href={`/visits/${visit.id}`}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
          >
            Open clinical chart
          </Link>
        </Can>
      </PageHeader>

      <ClinicalSurface className="overflow-hidden">
        <div className="space-y-3 p-3">
          <PatientDemographicsStrip
            patient={visit.patient}
            extra={[
              { label: "Dentist", value: visit.dentist.fullName },
              {
                label: "Appointment",
                value: visit.appointment
                  ? `${formatTime(visit.appointment.appointmentTime)} · ${visit.appointment.purpose}`
                  : "Walk-in",
              },
            ]}
          />

          <HistoryRecord visit={visit} />
        </div>
      </ClinicalSurface>
    </>
  );
}

function HistoryRecord({ visit }: { visit: VisitDetail }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
        <p className="clinical-label mb-3">Visit summary</p>
        <div className="grid gap-3">
          <DataPoint label="Opened" value={formatDateTime(visit.createdAt)} />
          <DataPoint
            label="Started"
            value={visit.startedAt ? formatDateTime(visit.startedAt) : "—"}
          />
          <DataPoint
            label="Closed"
            value={visit.finishedAt ? formatDateTime(visit.finishedAt) : "Still open"}
          />
          <DataPoint label="Chief complaint" value={visit.chiefComplaint ?? "—"} />
          <DataPoint label="Clinical findings" value={visit.clinicalFindings ?? "—"} />
          <DataPoint label="Diagnosis" value={visit.diagnosis ?? "—"} />
          <DataPoint label="Notes" value={visit.notes ?? "—"} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
          <p className="clinical-label mb-3">Orders</p>
          {visit.visitProcedures.length === 0 ? (
            <p className="text-sm text-[var(--clinical-muted)]">No services ordered.</p>
          ) : (
            <ul className="divide-y divide-[var(--clinical-border)]">
              {visit.visitProcedures.map((procedure) => (
                <li key={procedure.id} className="flex items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{procedure.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--clinical-muted)]">
                      {procedure.estimatedPrice != null
                        ? formatMoney(procedure.estimatedPrice)
                        : "—"}
                      {procedure.treatmentCatalog
                        ? ` · ${procedure.treatmentCatalog.name}`
                        : ""}
                    </p>
                  </div>
                  <ProcedureStatusBadge status={procedure.status as VisitProcedureStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
          <p className="clinical-label mb-3">Prescriptions</p>
          {visit.prescriptions.length === 0 ? (
            <p className="text-sm text-[var(--clinical-muted)]">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {visit.prescriptions.map((rx) => (
                <li key={rx.id} className="text-sm">
                  <span className="font-medium">{rx.medicine}</span>
                  <span className="text-[var(--clinical-muted)]"> · {rx.dosage}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {visit.files.length > 0 ? (
          <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
            <p className="clinical-label mb-3">Files</p>
            <div className="flex flex-wrap gap-3">
              {visit.files.map((attached) => (
                <figure
                  key={attached.id}
                  className="w-28 overflow-hidden border border-border bg-muted/40"
                >
                  <AuthImage
                    fileId={attached.fileId}
                    alt={attached.description || attached.file.fileName}
                    className="aspect-square w-full object-cover"
                  />
                  <figcaption className="p-1.5">
                    <p className="truncate text-[10px]">{attached.file.fileName}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      {formatBytes(attached.file.sizeBytes)} · {formatEnum(attached.purpose)}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
