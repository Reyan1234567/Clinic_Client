"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarPlus, ClipboardPlus, Pencil, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { CreatePlanDialog } from "@/components/treatment-plans/create-plan-dialog";
import { CreateVisitDialog } from "@/components/visits/create-visit-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataPoint } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { PlanStatusBadge } from "@/components/ui/status-badge";
import {
  EmptyState,
  ErrorState,
  FullPageSpinner,
  TableSkeleton,
} from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as patientsApi from "@/lib/api/patients";
import * as plansApi from "@/lib/api/treatment-plans";
import * as visitsApi from "@/lib/api/visits";
import { ageFromDateOfBirth, formatDateOnly, formatDateTime, formatPatientDemographics } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/types";

export default function PatientDetailPage() {
  return (
    <RequirePermission anyOf={["patient.read"]}>
      <PatientDetailScreen />
    </RequirePermission>
  );
}

function PatientDetailScreen() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { has, hasScope } = usePermissions();

  const [visitOpen, setVisitOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);

  const patientQuery = useQuery({
    queryKey: queryKeys.patient(patientId),
    queryFn: () => patientsApi.getPatient(patientId),
    enabled: Number.isFinite(patientId),
  });

  const archiveMutation = useMutation({
    mutationFn: () => patientsApi.archivePatient(patientId),
    onSuccess: () => {
      toast.success("Patient archived");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      router.push("/patients");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not archive patient"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.deletePatient(patientId),
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      router.push("/patients");
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.isConflict) {
        setDeleteBlockedReason(error.message);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Could not delete patient");
      setDeleteOpen(false);
    },
  });

  if (patientQuery.isPending) return <FullPageSpinner label="Loading patient" />;
  if (patientQuery.isError) {
    return <ErrorState error={patientQuery.error} onRetry={() => patientQuery.refetch()} />;
  }

  const patient = patientQuery.data;
  const ageYears = ageFromDateOfBirth(patient.dateOfBirth);

  return (
    <>
      <PageHeader
        eyebrow={`Records / ${patient.patientNumber}`}
        title={patient.fullName}
        description={`${formatPatientDemographics(patient)} · ${patient.phone}`}
      >
        <Can permission="appointment.create">
          <Button asChild variant="outline" size="sm">
            <Link href={`/appointments/new?patientId=${patient.id}`}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Book
            </Link>
          </Button>
        </Can>
        <Can permission="treatmentPlan.create">
          <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
            <ClipboardPlus className="h-3.5 w-3.5" />
            New plan
          </Button>
        </Can>
        {/* Desk has visit.create for walk-in; clinical chart needs visit.read. */}
        <Can allOf={["visit.create", "visit.read"]}>
          <Button size="sm" onClick={() => setVisitOpen(true)}>
            <Stethoscope className="h-3.5 w-3.5" />
            Open visit
          </Button>
        </Can>
        <Can permission="patient.update">
          <Button asChild variant="outline" size="sm">
            <Link href={`/patients/${patient.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        </Can>
        <Can permission="patient.archive">
          <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        </Can>
        <Can permission="patient.delete">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteBlockedReason(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </Can>
      </PageHeader>

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <DataPoint label="Patient number" value={<span className="font-mono">{patient.patientNumber}</span>} />
              <DataPoint label="Phone" value={<span className="font-mono">{patient.phone}</span>} />
              <DataPoint label="Date of birth" value={formatDateOnly(patient.dateOfBirth)} />
              <DataPoint
                label="Age"
                value={ageYears === null ? "—" : `${ageYears} year${ageYears === 1 ? "" : "s"}`}
              />
              <DataPoint label="Address" value={patient.address} />
              <DataPoint label="Registered" value={formatDateTime(patient.createdAt)} />
              <DataPoint label="Last updated" value={formatDateTime(patient.updatedAt)} />
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <PatientVisitHistory patientId={patient.id} />
          </div>
        </div>

        {hasScope("treatmentPlan.read", "GLOBAL") ||
        hasScope("treatmentPlan.read", "PERSONAL") ? (
          <PatientTreatmentPlans patientId={patient.id} phone={patient.phone} />
        ) : null}
      </div>

      <CreateVisitDialog
        open={visitOpen}
        onOpenChange={setVisitOpen}
        patientId={patient.id}
        patientName={patient.fullName}
      />
      <CreatePlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        patientId={patient.id}
        patientName={patient.fullName}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this patient?"
        description={`${patient.fullName} will be hidden from every list. Their history is kept.`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteBlockedReason(null);
        }}
        title={deleteBlockedReason ? "Cannot delete this patient" : "Delete permanently?"}
        description={
          deleteBlockedReason ??
          `${patient.fullName} and their record will be removed for good. This cannot be undone.`
        }
        confirmLabel={deleteBlockedReason ? "Delete anyway" : "Delete permanently"}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      >
        {deleteBlockedReason && has("patient.archive") ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate()}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive instead
          </Button>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

function PatientVisitHistory({ patientId }: { patientId: number; phone?: string }) {
  const query = useQuery({
    queryKey: queryKeys.visitsForPatient(patientId, { limit: 50 }),
    queryFn: () => visitsApi.listVisitsForPatient(patientId, { limit: 50 }),
  });

  const visits = query.data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit history</CardTitle>
      </CardHeader>

      {query.isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
      ) : visits.length === 0 ? (
        <EmptyState
          className="border-0"
          title="No visits recorded"
          description="Clinical visits for this patient will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Chief complaint</TableHead>
              <TableHead>Dentist</TableHead>
              <TableHead>Procedures</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <ClickableTableRow
                key={visit.id}
                href={`/patients/${patientId}/history/${visit.id}`}
              >
                <TableCell className="whitespace-nowrap text-xs font-medium">
                  {formatDateOnly(visit.createdAt)}
                </TableCell>
                <TableCell className="truncate text-xs">
                  {visit.chiefComplaint ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{visit.dentist.fullName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {visit.visitProcedures.length}
                </TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function PatientTreatmentPlans({ patientId, phone }: { patientId: number; phone: string }) {
  const { hasScope } = usePermissions();
  const useMine = hasScope("treatmentPlan.read", "PERSONAL");
  const listParams = { search: phone, limit: 50 };

  const query = useQuery({
    queryKey: useMine
      ? queryKeys.myTreatmentPlans(listParams)
      : queryKeys.treatmentPlans(listParams),
    queryFn: () =>
      useMine
        ? plansApi.listMyTreatmentPlans(listParams)
        : plansApi.listTreatmentPlans(listParams),
  });

  const plans = (query.data?.data ?? []).filter((plan) => plan.patientId === patientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment plans</CardTitle>
      </CardHeader>

      {query.isPending ? (
        <TableSkeleton rows={2} columns={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
      ) : plans.length === 0 ? (
        <EmptyState
          className="border-0"
          title="No treatment plans"
          description="Plans group the procedures intended for this patient."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <ClickableTableRow key={plan.id} href={`/treatment-plans/${plan.id}`}>
                <TableCell className="text-xs font-medium">{plan.title}</TableCell>
                <TableCell>
                  <PlanStatusBadge status={plan.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateOnly(plan.createdAt)}
                </TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
