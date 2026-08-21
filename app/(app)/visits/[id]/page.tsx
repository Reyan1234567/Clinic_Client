"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { ClinicalSurface } from "@/components/clinical/clinical-surface";
import {
  ClinicalActionButton,
  ClinicalActionRow,
} from "@/components/clinical/clinical-tabs";
import { PatientDemographicsStrip } from "@/components/clinical/patient-demographics-strip";
import { PatientHistoryPanel } from "@/components/visits/patient-history-panel";
import { VisitFiles } from "@/components/visits/visit-files";
import { VisitCertificates } from "@/components/visits/visit-certificates";
import { VisitOrderPanel } from "@/components/visits/visit-order-panel";
import { VisitPrescriptions } from "@/components/visits/visit-prescriptions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataPoint, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { VisitStateBadge } from "@/components/ui/status-badge";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import * as visitsApi from "@/lib/api/visits";
import { formatDateOnly, formatDateTime, formatTime } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type VisitDetail } from "@/lib/types";

type ChartTab =
  | "patient-history"
  | "history"
  | "clinical"
  | "orders"
  | "images"
  | "certificates";

export default function VisitDetailPage() {
  return (
    <RequirePermission anyOf={["visit.read", "visit:all"]} redirectTo="/dashboard">
      <VisitDetailScreen />
    </RequirePermission>
  );
}

function VisitDetailScreen() {
  const params = useParams<{ id: string }>();
  const visitId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasScope } = usePermissions();
  const canRollbackVisit = hasScope("visit.rollbackFinished", "GLOBAL");

  const [chartTab, setChartTab] = useState<ChartTab>("orders");
  const [editOpen, setEditOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.visit(visitId),
    queryFn: () => visitsApi.getVisit(visitId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.visit(visitId) });
    queryClient.invalidateQueries({ queryKey: ["visits"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const startMutation = useMutation({
    mutationFn: () => visitsApi.startVisit(visitId),
    onSuccess: () => {
      toast.success("Visit started");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not start visit"),
  });

  const finishMutation = useMutation({
    mutationFn: () => visitsApi.finishVisit(visitId),
    onSuccess: (data) => {
      if (data.invoice) {
        toast.success("Visit closed — sent to reception for payment", {
          description: `${data.invoice.invoiceNumber} · ${data.invoice.total}`,
        });
      } else {
        toast.success("Visit closed — nothing to bill");
      }
      setFinishOpen(false);
      refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not close visit");
      setFinishOpen(false);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: () => visitsApi.rollbackVisit(visitId),
    onSuccess: () => {
      toast.success("Visit reopened");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not reopen visit"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => visitsApi.deleteVisit(visitId),
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      router.push("/visits/me");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete visit");
      setDeleteOpen(false);
    },
  });

  if (query.isPending) return <FullPageSpinner label="Loading visit" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const visit = query.data;
  const finished = visit.status === "CLOSED" || Boolean(visit.finishedAt);
  const inChair = visit.status === "OPEN";

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow={`Clinical / ${formatDateOnly(visit.createdAt)}`}
        title={visit.title || visit.patient.fullName}
        description="History, images, certificates, clinical data, and orders"
      >
        <VisitStateBadge finishedAt={visit.finishedAt} status={visit.status} />
      </PageHeader>

      <ClinicalSurface className="overflow-hidden">
        <ClinicalActionRow
          end={
            <>
              {visit.status === "WAITING" ? (
                <Can permission="visit.update">
                  <ClinicalActionButton
                    tone="success"
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate()}
                  >
                    {startMutation.isPending ? "Starting…" : "Start"}
                  </ClinicalActionButton>
                </Can>
              ) : null}
              {inChair ? (
                <Can permission="visit.setFinished">
                  <ClinicalActionButton tone="success" onClick={() => setFinishOpen(true)}>
                    Close visit
                  </ClinicalActionButton>
                </Can>
              ) : null}
              <Can permission="visit.delete">
                <ClinicalActionButton tone="danger" onClick={() => setDeleteOpen(true)}>
                  Delete
                </ClinicalActionButton>
              </Can>
            </>
          }
        >
          <ClinicalActionButton
            active={chartTab === "patient-history"}
            onClick={() => setChartTab("patient-history")}
          >
            Patient history
          </ClinicalActionButton>
          <ClinicalActionButton
            active={chartTab === "history"}
            onClick={() => setChartTab("history")}
          >
            View
          </ClinicalActionButton>
          <ClinicalActionButton
            active={chartTab === "clinical"}
            onClick={() => setChartTab("clinical")}
          >
            View clinical data
          </ClinicalActionButton>
          <ClinicalActionButton
            active={chartTab === "orders"}
            onClick={() => setChartTab("orders")}
          >
            View orders
          </ClinicalActionButton>
          <ClinicalActionButton
            active={chartTab === "images"}
            onClick={() => setChartTab("images")}
          >
            Images
          </ClinicalActionButton>
          <ClinicalActionButton
            active={chartTab === "certificates"}
            onClick={() => setChartTab("certificates")}
          >
            Certificates
          </ClinicalActionButton>
          {/* {inChair ? (
            <Can permission="visit.update">
              <ClinicalActionButton onClick={() => setEditOpen(true)}>
                Edit clinical
              </ClinicalActionButton>
            </Can>
          ) : null} */}
          {finished && canRollbackVisit ? (
            <Can permission="visit.rollbackFinished">
              <ClinicalActionButton
                disabled={rollbackMutation.isPending}
                onClick={() => rollbackMutation.mutate()}
              >
                Reopen
              </ClinicalActionButton>
            </Can>
          ) : null}
        </ClinicalActionRow>

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

          {visit.status === "WAITING" ? (
            <p className="border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
              Patient is waiting. Press <span className="font-medium">Start</span> when they are in
              the chair.
            </p>
          ) : null}

          {chartTab === "patient-history" ? (
            <PatientHistoryPanel
              patientId={visit.patient.id}
              currentVisitId={visit.id}
            />
          ) : null}

          {chartTab === "history" ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <HistoryPanel visit={visit} />
              <VisitPrescriptions
                visitId={visit.id}
                prescriptions={visit.prescriptions}
                visitFinished={!inChair}
                onChanged={refresh}
              />
            </div>
          ) : null}

          {chartTab === "clinical" ? (
            <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="clinical-label">Clinical data</p>
                {inChair ? (
                  <Can permission="visit.update">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Can>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DataPoint label="Chief complaint" value={visit.chiefComplaint ?? "—"} />
                <DataPoint label="Diagnosis" value={visit.diagnosis ?? "—"} />
                <DataPoint label="Clinical findings" value={visit.clinicalFindings ?? "—"} />
                <DataPoint label="Notes" value={visit.notes ?? "—"} />
              </div>
            </div>
          ) : null}

          {chartTab === "orders" ? (
            <VisitOrderPanel
              visitId={visit.id}
              procedures={visit.visitProcedures}
              visitFinished={!inChair}
              onChanged={refresh}
            />
          ) : null}

          {chartTab === "images" ? (
            <VisitFiles
              visitId={visit.id}
              files={visit.files}
              visitFinished={!inChair}
              onChanged={refresh}
            />
          ) : null}

          {chartTab === "certificates" ? (
            <VisitCertificates visit={visit} visitFinished={!inChair} />
          ) : null}
        </div>
      </ClinicalSurface>

      <EditVisitDialog open={editOpen} onOpenChange={setEditOpen} visit={visit} onDone={refresh} />

      <ConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        title="Close this visit?"
        description="The visit becomes read-only. Every order line must be Done or Failed. A linked appointment is marked completed."
        confirmLabel="Close visit"
        pending={finishMutation.isPending}
        onConfirm={() => finishMutation.mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this visit?"
        description="The clinical record for this visit will be removed."
        confirmLabel="Delete visit"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}

function HistoryPanel({ visit }: { visit: VisitDetail }) {
  return (
    <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
      <p className="clinical-label mb-3">Main history page</p>
      <div className="grid gap-3">
        <DataPoint
          label="Patient"
          value={
            <Link href={`/patients/${visit.patient.id}`} className="font-medium hover:underline">
              {visit.patient.fullName}
            </Link>
          }
        />
        <DataPoint
          label="From appointment"
          value={
            visit.appointment ? (
              <Link
                href={`/appointments/${visit.appointment.id}`}
                className="font-medium hover:underline"
              >
                {visit.appointment.purpose}
              </Link>
            ) : (
              "Walk-in"
            )
          }
        />
        <DataPoint label="Treating dentist" value={visit.dentist.fullName} />
        <DataPoint label="Opened" value={formatDateTime(visit.createdAt)} />
        <DataPoint
          label="Started"
          value={visit.startedAt ? formatDateTime(visit.startedAt) : "—"}
        />
        <DataPoint
          label="Closed"
          value={visit.finishedAt ? formatDateTime(visit.finishedAt) : "Still open"}
        />
        {visit.treatmentPlanItems ? (
          <DataPoint
            label="From plan"
            value={
              <Link
                href={`/treatment-plans/${visit.treatmentPlanItems.treatmentPlanId}`}
                className="inline-flex max-w-full items-center gap-1 truncate text-[11px] underline-offset-2 hover:underline"
              >
                <ClipboardList className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">
                  Treatment plan
                  {visit.treatmentPlanItems.plannedProcedures.length > 0
                    ? ` · ${visit.treatmentPlanItems.plannedProcedures.length} procedure${visit.treatmentPlanItems.plannedProcedures.length === 1 ? "" : "s"}`
                    : ""}
                </span>
              </Link>
            }
          />
        ) : null}
        <DataPoint label="Chief complaint" value={visit.chiefComplaint ?? "—"} />
        <DataPoint label="Diagnosis" value={visit.diagnosis ?? "—"} />
      </div>
    </div>
  );
}

const editSchema = z.object({
  title: z.string().trim().optional(),
  chiefComplaint: z.string().trim().optional(),
  clinicalFindings: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type EditValues = z.infer<typeof editSchema>;

function EditVisitDialog({
  open,
  onOpenChange,
  visit,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: VisitDetail;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: visit.title ?? "",
      chiefComplaint: visit.chiefComplaint ?? "",
      clinicalFindings: visit.clinicalFindings ?? "",
      diagnosis: visit.diagnosis ?? "",
      notes: visit.notes ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await visitsApi.updateVisit(visit.id, {
        title: values.title || undefined,
        chiefComplaint: values.chiefComplaint || undefined,
        clinicalFindings: values.clinicalFindings || undefined,
        diagnosis: values.diagnosis || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Visit updated");
      onOpenChange(false);
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit clinical record</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Title" htmlFor="edit-title" error={errors.title?.message}>
            <Input id="edit-title" {...register("title")} />
          </Field>

          <Field
            label="Chief complaint"
            htmlFor="edit-complaint"
            error={errors.chiefComplaint?.message}
          >
            <Textarea id="edit-complaint" rows={2} {...register("chiefComplaint")} />
          </Field>

          <Field
            label="Clinical findings"
            htmlFor="edit-findings"
            error={errors.clinicalFindings?.message}
          >
            <Textarea id="edit-findings" rows={2} {...register("clinicalFindings")} />
          </Field>

          <Field label="Diagnosis" htmlFor="edit-diagnosis" error={errors.diagnosis?.message}>
            <Input id="edit-diagnosis" {...register("diagnosis")} />
          </Field>

          <Field label="Notes" htmlFor="edit-notes" error={errors.notes?.message}>
            <Textarea id="edit-notes" rows={3} {...register("notes")} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
