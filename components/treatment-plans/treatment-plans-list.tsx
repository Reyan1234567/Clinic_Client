"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PatientPicker } from "@/components/appointments/patient-picker";
import { Can } from "@/components/auth/can";
import { CreatePlanDialog } from "@/components/treatment-plans/create-plan-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanStatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as plansApi from "@/lib/api/treatment-plans";
import { formatDateOnly } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import type { Patient, TreatmentPlanStatus } from "@/lib/types";

const LIMIT = 10;
const ALL = "ALL";

export function TreatmentPlansList({ mode }: { mode: "all" | "mine" }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TreatmentPlanStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [pickPatientOpen, setPickPatientOpen] = useState(false);
  const [chosenPatient, setChosenPatient] = useState<Patient | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const { has } = usePermissions();

  const params = {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  };

  const query = useQuery({
    queryKey:
      mode === "mine"
        ? queryKeys.myTreatmentPlans(params)
        : queryKeys.treatmentPlans(params),
    queryFn: () =>
      mode === "mine"
        ? plansApi.listMyTreatmentPlans(params)
        : plansApi.listTreatmentPlans(params),
  });

  // A plan is always created against a patient, so the flow starts by choosing
  // one. That needs patient.read as well as treatmentPlan.create.
  const canStartPlan = has("treatmentPlan.create") && has("patient.read");
  const isMine = mode === "mine";

  return (
    <>
      <PageHeader
        eyebrow="Clinical"
        title={isMine ? "My treatment plans" : "All treatment plans"}
        description={
          isMine
            ? "Plans you created or are assigned to as the treating dentist."
            : "Clinic-wide planned work grouped per patient."
        }
      >
        {canStartPlan ? (
          <Button size="sm" onClick={() => setPickPatientOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New plan
          </Button>
        ) : null}
      </PageHeader>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search patient name or phone"
            className="max-w-xs flex-1"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as TreatmentPlanStatus | typeof ALL);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.isPending ? (
          <TableSkeleton columns={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching plans" : "No treatment plans"}
            description={
              debouncedSearch
                ? "Try another patient name or phone number."
                : isMine
                  ? "Create a plan or get assigned to one to see it here."
                  : "Create a plan from a patient record to sequence their treatment."
            }
            action={
              canStartPlan ? (
                <Button size="sm" onClick={() => setPickPatientOpen(true)}>
                  New plan
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-xs">
                      <Link
                        href={`/treatment-plans/${plan.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {plan.title}
                      </Link>
                      {plan.description ? (
                        <p className="max-w-[18rem] truncate text-[11px] text-muted-foreground">
                          {plan.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Can permission="patient.read" fallback={plan.patient.fullName}>
                        <Link
                          href={`/patients/${plan.patient.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {plan.patient.fullName}
                        </Link>
                      </Can>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {plan.patient.patientNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PlanStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateOnly(plan.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateOnly(plan.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog open={pickPatientOpen} onOpenChange={setPickPatientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Which patient?</DialogTitle>
            <DialogDescription>Plans belong to a single patient record.</DialogDescription>
          </DialogHeader>

          <Field label="Patient" required>
            <PatientPicker value={chosenPatient} onChange={setChosenPatient} />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickPatientOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!chosenPatient} onClick={() => setPickPatientOpen(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chosenPatient && !pickPatientOpen ? (
        <CreatePlanDialog
          open
          onOpenChange={(open) => !open && setChosenPatient(null)}
          patientId={chosenPatient.id}
          patientName={chosenPatient.fullName}
        />
      ) : null}
    </>
  );
}
