"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { ClinicalSurface } from "@/components/clinical/clinical-surface";
import { ClinicalTabs } from "@/components/clinical/clinical-tabs";
import { ProcessSelectorDialog } from "@/components/clinical/process-selector-dialog";
import {
  ClinicalLegend,
  ClinicalStatusPill,
  WorklistIconActions,
} from "@/components/clinical/worklist-actions";
import {
  WorklistFilterBar,
  matchWorklistFilters,
  type WorklistFilters,
} from "@/components/clinical/worklist-filter-bar";
import { WalkInDialog } from "@/components/visits/walk-in-dialog";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import * as appointmentsApi from "@/lib/api/appointments";
import * as visitsApi from "@/lib/api/visits";
import { formatDateOnlyShort, formatTime, todayKey } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type QueueRow } from "@/lib/types";

type Tab = "scheduled" | "waiting" | "serving" | "done";

const EMPTY_FILTERS: WorklistFilters = {
  patientName: "",
  patientNumber: "",
  mobile: "",
};

export function VisitQueueScreen({ mode }: { mode: "clinic" | "mine" }) {
  const isMine = mode === "mine";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { has, hasScope } = usePermissions();
  const canCheckIn = hasScope("appointment.checkIn", "GLOBAL");
  const canOpenClinicalVisit = has("visit.read");
  const [tab, setTab] = useState<Tab>("waiting");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [filters, setFilters] = useState<WorklistFilters>(EMPTY_FILTERS);
  const [processRow, setProcessRow] = useState<QueueRow | null>(null);

  const query = useQuery({
    queryKey: isMine ? queryKeys.myVisitQueueToday : queryKeys.visitQueueToday,
    queryFn: isMine ? visitsApi.getMyTodayQueue : visitsApi.getTodayQueue,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["visits"] });
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const checkInMutation = useMutation({
    mutationFn: (appointmentId: string) => appointmentsApi.checkInAppointment(appointmentId),
    onSuccess: (appointment) => {
      toast.success("Patient is waiting");
      invalidate();
      const visitId = appointment.visit?.id;
      if (visitId && canOpenClinicalVisit) {
        router.push(`/visits/${visitId}`);
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not check in"),
  });

  const startMutation = useMutation({
    mutationFn: (visitId: string) => visitsApi.startVisit(visitId),
    onSuccess: (visit) => {
      toast.success("Visit started");
      invalidate();
      router.push(`/visits/${visit.id}`);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not start visit"),
  });

  const queue = query.data;
  const scheduledRows = queue?.scheduled ?? (queue?.waiting ?? []).filter((row) => row.status === "SCHEDULED");
  const waitingRows = (queue?.waiting ?? []).filter((row) => row.status === "WAITING");
  const sourceRows =
    tab === "scheduled"
      ? scheduledRows
      : tab === "waiting"
        ? waitingRows
        : tab === "serving"
          ? (queue?.serving ?? [])
          : (queue?.done ?? []);

  const rows = useMemo(() => {
    const filtered = sourceRows.filter((row) =>
      matchWorklistFilters(filters, {
        fullName: row.patient?.fullName,
        patientNumber: row.patient?.patientNumber,
        phone: row.patient?.phone,
      }),
    );
    return filtered.slice().sort((a, b) => {
      const ta = a.appointmentTime ? new Date(a.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.appointmentTime ? new Date(b.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  }, [sourceRows, filters]);

  const tabLabel =
    tab === "scheduled"
      ? "Patients scheduled…"
      : tab === "waiting"
        ? "Patients waiting…"
        : tab === "serving"
          ? "Patients currently serving…"
          : "Completed today…";

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow={`Floor / ${formatDateOnlyShort(todayKey())}`}
        title={isMine ? "My patients today" : "Today's floor"}
        description={
          isMine
            ? "Filter the list, play to start, folder to open the visit."
            : "Filter the list, check in booked patients, folder for more actions."
        }
      >
        <Can permission="visit.create">
          <Button size="sm" variant="outline" onClick={() => setWalkInOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Walk-in
          </Button>
        </Can>
      </PageHeader>

      <ClinicalSurface className="overflow-hidden">
        <div className="border-b border-[var(--clinical-border)] bg-[var(--clinical-header)] px-3 py-2">
          <p className="text-sm font-medium text-[var(--clinical-fg)]">{tabLabel}</p>
        </div>

        <ClinicalTabs
          className="border-x-0 border-t-0 [&_[role=tab]:last-child]:border-r"
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          tabs={[
            { id: "scheduled", label: `Scheduled (${scheduledRows.length})` },
            { id: "waiting", label: `Waiting (${waitingRows.length})` },
            { id: "serving", label: `In chair (${queue?.serving.length ?? 0})` },
            { id: "done", label: `Done (${queue?.done.length ?? 0})` },
          ]}
        />

        <WorklistFilterBar
          className="border-x-0 border-t-0"
          value={filters}
          onChange={setFilters}
          onRefresh={() => void query.refetch()}
          refreshing={query.isFetching}
        />

        <div className="min-h-[16rem] overflow-x-auto">
          {query.isPending ? (
            <div className="p-3">
              <TableSkeleton columns={isMine ? 5 : 6} />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
          ) : rows.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent"
              title={
                tab === "scheduled"
                  ? "Nobody booked"
                  : tab === "waiting"
                    ? "Nobody waiting"
                    : tab === "serving"
                      ? "No one in the chair"
                      : "No finished visits yet today"
              }
              description={
                tab === "scheduled"
                  ? "Remaining booked appointments for today show up here."
                  : tab === "waiting"
                    ? "Checked-in patients appear here until they are taken into the chair."
                    : undefined
              }
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="w-16">Action</th>
                  <th>Appt time</th>
                  <th>Patient name</th>
                  <th>Patient #</th>
                  <th>Mobile</th>
                  {!isMine ? <th>Doctor</th> : null}
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <QueueRowView
                    key={`${row.status}-${row.visitId ?? row.appointmentId}`}
                    row={row}
                    showDentist={!isMine}
                    canCheckIn={canCheckIn}
                    canStartVisit={canOpenClinicalVisit}
                    pendingCheckIn={checkInMutation.isPending}
                    pendingStart={startMutation.isPending}
                    onCheckIn={() => row.appointmentId && checkInMutation.mutate(row.appointmentId)}
                    onStart={() => row.visitId && startMutation.mutate(row.visitId)}
                    onProcess={() => setProcessRow(row)}
                    onOpenVisit={() =>
                      row.visitId && router.push(`/visits/${row.visitId}`)
                    }
                    canOpenVisit={canOpenClinicalVisit && Boolean(row.visitId)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <ClinicalLegend />
      </ClinicalSurface>

      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} />

      <ProcessSelectorDialog
        open={Boolean(processRow)}
        onOpenChange={(open) => !open && setProcessRow(null)}
        title="Process selector"
        subtitle={processRow?.patient?.fullName}
        actions={[
          {
            key: "history",
            label: "Patient history",
            disabled: !processRow?.patient,
            onSelect: () =>
              processRow?.patient &&
              router.push(`/patients/${processRow.patient.id}`),
          },
          ...(canOpenClinicalVisit
            ? [
                {
                  key: "visit",
                  label:
                    processRow?.status === "WAITING"
                      ? "Open waiting visit"
                      : processRow?.visitId
                        ? "Open visit / order"
                        : "No visit yet",
                  disabled: !processRow?.visitId,
                  onSelect: () =>
                    processRow?.visitId && router.push(`/visits/${processRow.visitId}`),
                },
              ]
            : []),
          {
            key: "appointment",
            label: "New appointment",
            disabled: !processRow?.patient,
            onSelect: () =>
              processRow?.patient &&
              router.push(`/appointments/new?patientId=${processRow.patient.id}`),
          },
        ]}
      />
    </>
  );
}

function sourceLabel(row: QueueRow) {
  if (row.status === "SCHEDULED") return "Booked";
  if (row.source === "WALK_IN") return "Walk-in";
  if (row.source === "PLAN_ITEM") return "From plan";
  return "Appointment";
}

function statusTone(row: QueueRow): "booked" | "wait" | "active" | "done" {
  if (row.status === "SCHEDULED") return "booked";
  if (row.status === "WAITING") return "wait";
  if (row.status === "OPEN") return "active";
  return "done";
}

function QueueRowView({
  row,
  showDentist,
  canCheckIn,
  canStartVisit,
  pendingCheckIn,
  pendingStart,
  onCheckIn,
  onStart,
  onProcess,
  onOpenVisit,
  canOpenVisit,
}: {
  row: QueueRow;
  showDentist: boolean;
  canCheckIn: boolean;
  canStartVisit: boolean;
  pendingCheckIn: boolean;
  pendingStart: boolean;
  onCheckIn: () => void;
  onStart: () => void;
  onProcess: () => void;
  onOpenVisit: () => void;
  canOpenVisit: boolean;
}) {
  const name = row.patient?.fullName ?? "Unknown";
  const number = row.patient?.patientNumber ?? "—";
  const phone = row.patient?.phone ?? "—";

  const play =
    canStartVisit && row.status === "WAITING" && row.visitId
      ? () => onStart()
      : row.status === "SCHEDULED" && canCheckIn && row.appointmentId
        ? () => onCheckIn()
        : undefined;

  return (
    <tr>
      <td>
        <WorklistIconActions
          onPlay={play}
          playLabel={row.status === "SCHEDULED" ? "Check in" : "Start visit"}
          playDisabled={pendingCheckIn || pendingStart}
          onOpen={canOpenVisit ? onOpenVisit : onProcess}
          openLabel={canOpenVisit ? "Open visit" : "Process selector"}
        />
      </td>
      <td className="whitespace-nowrap font-mono text-xs text-primary">
        {formatTime(row.appointmentTime)}
      </td>
      <td>
        {row.patient ? (
          <Link
            href={`/patients/${row.patient.id}`}
            className="text-sm font-medium text-[var(--clinical-fg)] hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="text-sm">{name}</span>
        )}
      </td>
      <td className="font-mono text-xs text-[var(--clinical-muted)]">{number}</td>
      <td className="font-mono text-xs text-[var(--clinical-muted)]">{phone}</td>
      {showDentist ? (
        <td className="whitespace-nowrap text-xs">{row.dentist?.fullName ?? "—"}</td>
      ) : null}
      <td className="max-w-[12rem] truncate text-xs text-[var(--clinical-muted)]">{row.purpose}</td>
      <td>
        <div className="flex flex-col gap-1">
          <ClinicalStatusPill tone={statusTone(row)}>{sourceLabel(row)}</ClinicalStatusPill>
          {row.status === "WAITING" && row.waitMinutes != null ? (
            <span className="font-mono text-[10px] text-[var(--clinical-muted)]">
              {row.waitMinutes} min wait
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
