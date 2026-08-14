"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ImagePlus,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { UploadAttachDialog } from "@/components/files/upload-attach-dialog";
import { AuthImage } from "@/components/files/auth-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcedureStatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import * as catalogApi from "@/lib/api/catalog";
import * as procedureApi from "@/lib/api/visit-procedures";
import { formatBytes, formatDateTime, formatEnum, formatMoney } from "@/lib/format";
import { CATALOG_CATEGORIES, type CatalogCategory } from "@/lib/catalog-categories";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import {
  ApiError,
  type CatalogItem,
  type ProcedureFile,
  type VisitProcedureExpanded,
  type VisitProcedureStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Catalog checklist to add services. Added lines default to succeeded.
 */
export function VisitOrderPanel({
  visitId,
  procedures,
  visitFinished,
  onChanged,
}: {
  visitId: string;
  procedures: VisitProcedureExpanded[];
  visitFinished: boolean;
  onChanged: () => void;
}) {
  const { has, hasScope } = usePermissions();
  const canRollbackFinished = hasScope("procedure.rollbackFinished", "GLOBAL");
  const canAttachImage = has("procedure.attachImage") && has("file.upload");
  const canMarkStatus = has("visit.update");

  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [checkedCatalogIds, setCheckedCatalogIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<VisitProcedureExpanded | null>(null);
  const [uploadTarget, setUploadTarget] = useState<VisitProcedureExpanded | null>(null);
  const [detachTarget, setDetachTarget] = useState<{
    procedureId: string;
    file: ProcedureFile;
  } | null>(null);

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog({ page: 1, limit: 100 }),
    queryFn: () => catalogApi.listCatalog({ page: 1, limit: 100 }),
  });

  const items = catalogQuery.data?.data ?? [];

  const categories = useMemo(() => {
    const fromData = new Set(items.map((item) => item.category));
    return CATALOG_CATEGORIES.filter((name) => fromData.has(name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        formatEnum(item.category).toLowerCase().includes(q)
      );
    });
  }, [items, category, search]);

  const selectedItems = useMemo(
    () => filtered.filter((item) => checkedCatalogIds.has(item.id)),
    [filtered, checkedCatalogIds],
  );

  const toggleCatalog = (id: string, next: boolean) => {
    setCheckedCatalogIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const addMutation = useMutation({
    mutationFn: async (catalogItems: CatalogItem[]) => {
      for (const item of catalogItems) {
        await procedureApi.createProcedureFromVisit(visitId, {
          title: item.name,
          treatmentCatalogId: item.id,
          description: item.description ?? undefined,
          estimatedPrice: Number(item.price),
          status: "SUCCEEDED",
        });
      }
      return catalogItems.length;
    },
    onSuccess: (count) => {
      toast.success(count === 1 ? "Service added" : `${count} services added`);
      setCheckedCatalogIds(new Set());
      onChanged();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not add service"),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      procedureId,
      status,
    }: {
      procedureId: string;
      status: "SUCCEEDED" | "FAILED";
    }) => procedureApi.setProcedureStatus(procedureId, status),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "SUCCEEDED" ? "Marked done" : "Marked failed",
      );
      onChanged();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update status"),
  });

  const rollbackMutation = useMutation({
    mutationFn: (procedureId: string) => procedureApi.rollbackProcedure(procedureId),
    onSuccess: () => {
      toast.success("Procedure reopened");
      onChanged();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not reopen procedure"),
  });

  const deleteMutation = useMutation({
    mutationFn: (procedureId: string) => procedureApi.deleteProcedure(procedureId),
    onSuccess: (message) => {
      toast.success(message);
      setDeleteTarget(null);
      onChanged();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete procedure");
      setDeleteTarget(null);
    },
  });

  const detachMutation = useMutation({
    mutationFn: ({ procedureId, fileId }: { procedureId: string; fileId: string }) =>
      procedureApi.detachImageFromProcedure(procedureId, fileId),
    onSuccess: () => {
      toast.success("Image removed");
      setDetachTarget(null);
      onChanged();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not remove image");
      setDetachTarget(null);
    },
  });

  const allVisibleChecked =
    filtered.length > 0 && filtered.every((item) => checkedCatalogIds.has(item.id));

  return (
    <div className="space-y-3">
      {!visitFinished ? (
        <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--clinical-border)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--clinical-fg)]">Add service</p>
              <p className="text-xs text-[var(--clinical-muted)]">
                Check catalog treatments, then add them to this visit.
              </p>
            </div>
            <Can anyOf={["procedure.create", "procedure.attach"]}>
              <Button
                size="sm"
                className="rounded-none"
                disabled={selectedItems.length === 0 || addMutation.isPending}
                onClick={() => addMutation.mutate(selectedItems)}
              >
                <Plus className="h-3.5 w-3.5" />
                {addMutation.isPending
                  ? "Adding…"
                  : selectedItems.length > 1
                    ? `Add service (${selectedItems.length})`
                    : "Add service"}
              </Button>
            </Can>
          </div>

          <div className="grid min-h-[16rem] lg:grid-cols-[14rem_minmax(0,1fr)]">
            <aside className="border-b border-[var(--clinical-border)] lg:border-b-0 lg:border-r">
              <p className="clinical-label border-b border-[var(--clinical-border)] px-3 py-2">
                By service type
              </p>
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "flex w-full items-center gap-1 px-3 py-2 text-left text-sm",
                  category === "all"
                    ? "bg-[var(--clinical-tab-active)] text-primary-foreground"
                    : "text-[var(--clinical-fg)] hover:bg-[var(--clinical-row-hover)]",
                )}
              >
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                All services
              </button>
              {categories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={cn(
                    "flex w-full items-center gap-1 px-3 py-2 text-left text-sm",
                    category === name
                      ? "bg-[var(--clinical-tab-active)] text-primary-foreground"
                      : "text-[var(--clinical-fg)] hover:bg-[var(--clinical-row-hover)]",
                  )}
                >
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  {formatEnum(name)}
                </button>
              ))}
            </aside>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap gap-2 border-b border-[var(--clinical-border)] p-2">
                <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                  <span className="clinical-label">Search</span>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Service name"
                    className="h-8 rounded-none"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {catalogQuery.isPending ? (
                  <div className="p-3">
                    <TableSkeleton columns={3} rows={5} />
                  </div>
                ) : catalogQuery.isError ? (
                  <ErrorState
                    className="border-0"
                    error={catalogQuery.error}
                    onRetry={() => catalogQuery.refetch()}
                  />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    className="border-0"
                    title="No services"
                    description="Nothing matches this group or search."
                  />
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th className="w-10">
                          <Checkbox
                            checked={allVisibleChecked}
                            onCheckedChange={(value) => {
                              const on = value === true;
                              setCheckedCatalogIds((prev) => {
                                const copy = new Set(prev);
                                for (const item of filtered) {
                                  if (on) copy.add(item.id);
                                  else copy.delete(item.id);
                                }
                                return copy;
                              });
                            }}
                            aria-label="Select all visible services"
                          />
                        </th>
                        <th>Service</th>
                        <th>Category</th>
                        <th className="text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const checked = checkedCatalogIds.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => toggleCatalog(item.id, !checked)}
                            className={cn(
                              "cursor-pointer",
                              checked && "bg-[var(--clinical-row-hover)]",
                            )}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleCatalog(item.id, value === true)
                                }
                                aria-label={`Select ${item.name}`}
                              />
                            </td>
                            <td>
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.description ? (
                                <p className="text-xs text-[var(--clinical-muted)]">
                                  {item.description}
                                </p>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap text-xs text-[var(--clinical-muted)]">
                              {formatEnum(item.category)}
                            </td>
                            <td className="whitespace-nowrap text-right font-mono text-xs">
                              {formatMoney(item.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)]">
        <div className="border-b border-[var(--clinical-border)] px-3 py-2">
          <p className="text-sm font-medium text-[var(--clinical-fg)]">Services on this visit</p>
          <p className="text-xs text-[var(--clinical-muted)]">
            Added services count as done. Use Failed only if a service was not completed.
          </p>
        </div>

        {procedures.length === 0 ? (
          <EmptyState
            className="border-0"
            title="No services ordered"
            description="Check catalog items above and press Add service."
          />
        ) : (
          <ul className="divide-y divide-[var(--clinical-border)]">
            {procedures.map((procedure) => {
              const procedureFinished = Boolean(procedure.finishedAt);
              const files = procedure.files ?? [];
              const canChangeStatus = !procedureFinished && !visitFinished && canMarkStatus;
              const failed = procedure.status === "FAILED";

              const actions: RowAction[] = [
                {
                  key: "rollback",
                  label: "Reopen",
                  icon: Undo2,
                  permission: "procedure.rollbackFinished",
                  available: procedureFinished && canRollbackFinished,
                  onSelect: () => rollbackMutation.mutate(procedure.id),
                },
                {
                  key: "image",
                  label: "Attach image",
                  icon: ImagePlus,
                  permission: "procedure.attachImage",
                  available: !procedureFinished && !visitFinished && canAttachImage,
                  onSelect: () => setUploadTarget(procedure),
                },
                {
                  key: "delete",
                  label: "Delete",
                  icon: Trash2,
                  permission: "procedure.delete",
                  available: !procedureFinished && !visitFinished,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => setDeleteTarget(procedure),
                },
              ];

              return (
                <li key={procedure.id} className="flex items-start gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          failed && "text-destructive",
                        )}
                      >
                        {procedure.title}
                      </p>
                      <ProcedureStatusBadge status={procedure.status as VisitProcedureStatus} />
                      {procedure.finishedAt ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          locked {formatDateTime(procedure.finishedAt)}
                        </span>
                      ) : null}
                    </div>

                    {procedure.description ? (
                      <p className="mt-1 text-xs text-[var(--clinical-muted)]">
                        {procedure.description}
                      </p>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
                      {procedure.treatmentCatalog ? (
                        <span>
                          Catalog · {procedure.treatmentCatalog.name} ·{" "}
                          {formatMoney(procedure.treatmentCatalog.price)}
                        </span>
                      ) : (
                        <span>Custom</span>
                      )}
                      {procedure.estimatedPrice != null ? (
                        <span>Est. {formatMoney(procedure.estimatedPrice)}</span>
                      ) : null}
                    </div>

                    {files.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {files.map((attached) => (
                          <figure
                            key={attached.id}
                            className="w-28 overflow-hidden border border-border bg-muted/40"
                          >
                            <AuthImage
                              src={attached.file.filePath}
                              alt={attached.description || attached.file.fileName}
                              className="aspect-square w-full object-cover"
                            />
                            <figcaption className="flex items-start justify-between gap-1 p-1.5">
                              <div className="min-w-0">
                                <p className="truncate text-[10px]">{attached.file.fileName}</p>
                                <p className="font-mono text-[9px] text-muted-foreground">
                                  {formatBytes(attached.file.sizeBytes)} ·{" "}
                                  {formatEnum(attached.purpose)}
                                </p>
                              </div>
                              {!procedureFinished && !visitFinished ? (
                                <Can permission="procedure.delete">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Remove image"
                                    onClick={() =>
                                      setDetachTarget({
                                        procedureId: procedure.id,
                                        file: attached,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </Can>
                              ) : null}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {canChangeStatus ? (
                      <Can permission="visit.update">
                        <Select
                          value={procedure.status === "FAILED" ? "FAILED" : "SUCCEEDED"}
                          onValueChange={(value) =>
                            statusMutation.mutate({
                              procedureId: procedure.id,
                              status: value as "SUCCEEDED" | "FAILED",
                            })
                          }
                          disabled={statusMutation.isPending}
                        >
                          <SelectTrigger
                            className="h-8 w-[8.5rem] rounded-none"
                            aria-label={`Status for ${procedure.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </Can>
                    ) : null}
                    <RowActionMenu actions={actions} label={`Actions for ${procedure.title}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this service?"
        description={
          deleteTarget ? `"${deleteTarget.title}" will be removed from the visit.` : undefined
        }
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <ConfirmDialog
        open={Boolean(detachTarget)}
        onOpenChange={(open) => !open && setDetachTarget(null)}
        title="Remove this image?"
        description="It will be detached from the procedure."
        confirmLabel="Remove"
        destructive
        pending={detachMutation.isPending}
        onConfirm={() =>
          detachTarget &&
          detachMutation.mutate({
            procedureId: detachTarget.procedureId,
            fileId: detachTarget.file.fileId,
          })
        }
      />

      {uploadTarget ? (
        <UploadAttachDialog
          open
          onOpenChange={(open) => !open && setUploadTarget(null)}
          bucket="procedure"
          title="Attach an image to this procedure"
          description={uploadTarget.title}
          onAttach={(input) => procedureApi.attachImageToProcedure(uploadTarget.id, input)}
          onDone={() => {
            setUploadTarget(null);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}
