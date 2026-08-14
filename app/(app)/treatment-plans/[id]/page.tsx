"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Stethoscope,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { PlanItemDialog } from "@/components/treatment-plans/plan-item-dialog";
import { PlannedProcedureDialog } from "@/components/treatment-plans/planned-procedure-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataPoint } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  PlanItemStatusBadge,
  PlanStatusBadge,
  PlannedProcedureStatusBadge,
} from "@/components/ui/status-badge";
import { EmptyState, ErrorState, FullPageSpinner } from "@/components/ui/states";
import * as plannedApi from "@/lib/api/plan-procedures";
import * as plansApi from "@/lib/api/treatment-plans";
import * as visitsApi from "@/lib/api/visits";
import { formatDateOnly, formatMoney, sumMoney } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type PlanItemExpanded, type PlannedProcedure } from "@/lib/types";

export default function TreatmentPlanDetailPage() {
  return (
    <RequirePermission anyOf={["treatmentPlan.read"]} redirectTo="/dashboard">
      <TreatmentPlanDetailScreen />
    </RequirePermission>
  );
}

function TreatmentPlanDetailScreen() {
  const params = useParams<{ id: string }>();
  const planId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasScope } = usePermissions();
  const plansListHref = hasScope("treatmentPlan.read", "PERSONAL")
    ? "/treatment-plans/me"
    : "/treatment-plans";

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanItemExpanded | null>(null);
  const [deleteItem, setDeleteItem] = useState<PlanItemExpanded | null>(null);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.treatmentPlan(planId),
    queryFn: () => plansApi.getTreatmentPlan(planId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.treatmentPlan(planId) });
    queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: "ACTIVE" | "COMPLETED") =>
      plansApi.setTreatmentPlanStatus(planId, status),
    onSuccess: () => {
      toast.success("Plan status updated");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update status"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: () => plansApi.deleteTreatmentPlan(planId),
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      router.push(plansListHref);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete plan");
      setDeletePlanOpen(false);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => plansApi.deletePlanItem(itemId),
    onSuccess: (message) => {
      toast.success(message);
      setDeleteItem(null);
      refresh();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete item");
      setDeleteItem(null);
    },
  });

  if (query.isPending) return <FullPageSpinner label="Loading treatment plan" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const plan = query.data;
  const plannedTotal = sumMoney(
    plan.items.flatMap((item) =>
      item.plannedProcedures.map((procedure) => procedure.estimatedPrice),
    ),
  );

  return (
    <>
      <PageHeader
        eyebrow={`Clinical / Plan ${plan.patient.patientNumber}`}
        title={plan.title}
        description={plan.description ?? undefined}
      >
        <PlanStatusBadge status={plan.status} />
        <Can permission="treatmentPlan.update">
          {plan.status === "ACTIVE" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("COMPLETED")}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Mark completed
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("ACTIVE")}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Reactivate
            </Button>
          )}
        </Can>
        {/* The server authorises plan deletion against treatmentPlan.update. */}
        <Can permission="treatmentPlan.update">
          <Button variant="danger" size="sm" onClick={() => setDeletePlanOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete plan
          </Button>
        </Can>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DataPoint
              label="Patient"
              value={
                <Can permission="patient.read" fallback={plan.patient.fullName}>
                  <Link
                    href={`/patients/${plan.patient.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {plan.patient.fullName}
                  </Link>
                </Can>
              }
            />
            <DataPoint
              label="Patient number"
              value={<span className="font-mono">{plan.patient.patientNumber}</span>}
            />
            <DataPoint label="Items" value={String(plan.items.length)} />
            <DataPoint
              label="Planned value"
              value={<span className="font-mono">{formatMoney(plannedTotal)}</span>}
            />
            <DataPoint label="Created" value={formatDateOnly(plan.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Plan items</CardTitle>
            {plan.status === "ACTIVE" ? (
              <Can permission="treatmentPlan.create">
                <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
              </Can>
            ) : null}
          </CardHeader>

          {plan.items.length === 0 ? (
            <EmptyState
              className="border-0"
              title="No items yet"
              description="Break the plan into items, then add the procedures planned for each."
            />
          ) : (
            <div className="divide-y divide-border">
              {plan.items.map((item) => (
                <PlanItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteItem(item)}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <PlanItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        treatmentPlanId={planId}
        onDone={refresh}
      />

      {editItem ? (
        <PlanItemDialog
          open
          onOpenChange={(open) => !open && setEditItem(null)}
          treatmentPlanId={planId}
          item={editItem}
          onDone={refresh}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete this plan item?"
        description="Its planned procedures are removed with it."
        confirmLabel="Delete item"
        destructive
        pending={deleteItemMutation.isPending}
        onConfirm={() => deleteItem && deleteItemMutation.mutate(deleteItem.id)}
      />

      <ConfirmDialog
        open={deletePlanOpen}
        onOpenChange={setDeletePlanOpen}
        title="Delete this treatment plan?"
        description={`"${plan.title}" and all of its items will be removed.`}
        confirmLabel="Delete plan"
        destructive
        pending={deletePlanMutation.isPending}
        onConfirm={() => deletePlanMutation.mutate()}
      />
    </>
  );
}

function PlanItemRow({
  item,
  onEdit,
  onDelete,
  onChanged,
}: {
  item: PlanItemExpanded;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [addProcedureOpen, setAddProcedureOpen] = useState(false);
  const [editProcedure, setEditProcedure] = useState<PlannedProcedure | null>(null);
  const [deleteProcedure, setDeleteProcedure] = useState<PlannedProcedure | null>(null);

  const statusMutation = useMutation({
    mutationFn: (status: "PLANNED" | "DONE") => plansApi.setPlanItemStatus(item.id, status),
    onSuccess: () => {
      toast.success("Item status updated");
      onChanged();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update item"),
  });

  const startVisitMutation = useMutation({
    // Copies the item's PLANNED procedures onto a fresh visit.
    mutationFn: () => visitsApi.createVisitFromPlanItem(item.id),
    onSuccess: (visit) => {
      toast.success("Visit created from this item");
      const visitId = visit?.id;
      if (!visitId) {
        toast.error("Visit created, but its id was missing — open Visits to continue");
        onChanged();
        return;
      }
      onChanged();
      router.push(`/visits/${visitId}`);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not create visit"),
  });

  const deleteProcedureMutation = useMutation({
    mutationFn: (procedureId: string) => plannedApi.deletePlannedProcedure(procedureId),
    onSuccess: (message) => {
      toast.success(message);
      setDeleteProcedure(null);
      onChanged();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete procedure");
      setDeleteProcedure(null);
    },
  });

  const itemActions: RowAction[] = [
    {
      key: "add-procedure",
      label: "Add planned procedure",
      icon: Plus,
      permission: "treatmentPlan.create",
      onSelect: () => setAddProcedureOpen(true),
    },
    {
      // The server checks treatmentPlan.delete for item edits, not .update.
      key: "edit",
      label: "Edit item",
      icon: Pencil,
      permission: "treatmentPlan.delete",
      onSelect: onEdit,
    },
    {
      key: "delete",
      label: "Delete item",
      icon: Trash2,
      permission: "treatmentPlan.delete",
      destructive: true,
      separatorBefore: true,
      onSelect: onDelete,
    },
  ];

  const isDone = item.status === "DONE";
  const StatusIcon = isDone ? Undo2 : CheckCircle2;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            <PlanItemStatusBadge status={item.status} />
            {item.patientVisits && item.patientVisits.length > 0 ? (
              <Link
                href={`/visits/${item.patientVisits[0].id}`}
                className="font-mono text-[10px] text-primary hover:underline"
              >
                linked visit
              </Link>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
            <span>
              {item.plannedDate
                ? `Planned ${formatDateOnly(item.plannedDate)}`
                : "No planned date"}
            </span>
            <span>Created {formatDateOnly(item.createdAt)}</span>
          </div>

          {item.notes ? (
            <p className="mt-1.5 border-l-2 border-border pl-2 text-xs text-muted-foreground">
              {item.notes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {!item.patientVisits?.some(
            (visit) => visit.status === "OPEN" || visit.status === "WAITING",
          ) ? (
            <Can permission="visit.create">
              <Button
                size="sm"
                onClick={() => startVisitMutation.mutate()}
                disabled={startVisitMutation.isPending}
              >
                {startVisitMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Stethoscope className="h-3.5 w-3.5" />
                )}
                Start visit
              </Button>
            </Can>
          ) : null}
          <Can permission="treatmentPlan.update">
            <Button
              size="sm"
              variant="outline"
              onClick={() => statusMutation.mutate(isDone ? "PLANNED" : "DONE")}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StatusIcon className="h-3.5 w-3.5" />
              )}
              {isDone ? "Mark planned" : "Mark done"}
            </Button>
          </Can>
          <RowActionMenu actions={itemActions} label="Plan item actions" />
        </div>
      </div>

      <div className="mt-2 pl-3">
        <span className="tech-label">Planned procedures</span>
        {item.plannedProcedures.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">None yet.</p>
        ) : (
          <div className="mt-1 divide-y divide-border border border-border">
            {item.plannedProcedures.map((procedure) => {
              const procedureActions: RowAction[] = [
                {
                  key: "edit",
                  label: "Edit",
                  icon: Pencil,
                  permission: "treatmentPlan.update",
                  onSelect: () => setEditProcedure(procedure),
                },
                {
                  key: "delete",
                  label: "Delete",
                  icon: Trash2,
                  permission: "treatmentPlan.delete",
                  destructive: true,
                  onSelect: () => setDeleteProcedure(procedure),
                },
              ];

              return (
                <div key={procedure.id} className="flex items-start gap-2 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-xs font-medium">{procedure.title}</p>
                      <PlannedProcedureStatusBadge status={procedure.status} />
                    </div>
                    {procedure.estimatedPrice ? (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        est. {formatMoney(procedure.estimatedPrice)}
                      </p>
                    ) : null}
                    {procedure.description ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {procedure.description}
                      </p>
                    ) : null}
                  </div>
                  <RowActionMenu actions={procedureActions} label={`Actions for ${procedure.title}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlannedProcedureDialog
        open={addProcedureOpen}
        onOpenChange={setAddProcedureOpen}
        treatmentPlanItemId={item.id}
        onDone={onChanged}
      />

      {editProcedure ? (
        <PlannedProcedureDialog
          open
          onOpenChange={(open) => !open && setEditProcedure(null)}
          treatmentPlanItemId={item.id}
          procedure={editProcedure}
          onDone={onChanged}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteProcedure)}
        onOpenChange={(open) => !open && setDeleteProcedure(null)}
        title="Delete this planned procedure?"
        description={deleteProcedure ? `"${deleteProcedure.title}" will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        pending={deleteProcedureMutation.isPending}
        onConfirm={() => deleteProcedure && deleteProcedureMutation.mutate(deleteProcedure.id)}
      />
    </div>
  );
}
