"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleX,
  ImagePlus,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { AddProcedureDialog } from "@/components/visits/add-procedure-dialog";
import { UploadAttachDialog } from "@/components/files/upload-attach-dialog";
import { AuthImage } from "@/components/files/auth-image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProcedureStatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import * as procedureApi from "@/lib/api/visit-procedures";
import { formatBytes, formatDateTime, formatEnum, formatMoney } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "@/lib/toast";
import {
  ApiError,
  type ProcedureFile,
  type VisitProcedureExpanded,
  type VisitProcedureStatus,
} from "@/lib/types";

export function VisitProcedures({
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
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VisitProcedureExpanded | null>(null);
  const [uploadTarget, setUploadTarget] = useState<VisitProcedureExpanded | null>(null);
  const [detachTarget, setDetachTarget] = useState<{
    procedureId: string;
    file: ProcedureFile;
  } | null>(null);

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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Orders</CardTitle>
        {!visitFinished ? (
          <Can anyOf={["procedure.create", "procedure.attach"]}>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add service
            </Button>
          </Can>
        ) : null}
      </CardHeader>

      {procedures.length === 0 ? (
        <EmptyState
          className="border-0"
          title="No services ordered"
          description="Add catalog treatments done in this visit, then mark each Done or Failed."
        />
      ) : (
        <div className="divide-y divide-border">
          {procedures.map((procedure) => {
            const procedureFinished = Boolean(procedure.finishedAt);
            const files = procedure.files ?? [];
            const canChangeStatus = !procedureFinished && !visitFinished;
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
              <div key={procedure.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{procedure.title}</p>
                    <ProcedureStatusBadge status={procedure.status as VisitProcedureStatus} />
                    {procedure.finishedAt ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        locked {formatDateTime(procedure.finishedAt)}
                      </span>
                    ) : null}
                  </div>

                  {procedure.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{procedure.description}</p>
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
                    {procedure.notes ? <span>{procedure.notes}</span> : null}
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
                                {formatBytes(attached.file.sizeBytes)} · {formatEnum(attached.purpose)}
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
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            procedureId: procedure.id,
                            status: "SUCCEEDED",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            procedureId: procedure.id,
                            status: "FAILED",
                          })
                        }
                      >
                        <CircleX className="h-3.5 w-3.5" />
                        Failed
                      </Button>
                    </Can>
                  ) : null}
                  <RowActionMenu actions={actions} label={`Actions for ${procedure.title}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddProcedureDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        visitId={visitId}
        onDone={onChanged}
      />

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
    </Card>
  );
}
