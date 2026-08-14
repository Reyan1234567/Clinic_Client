"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import * as prescriptionsApi from "@/lib/api/prescriptions";
import { formatDateTime } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { ApiError, type Prescription } from "@/lib/types";

const schema = z.object({
  medicine: z.string().trim().min(1, "Medicine is required"),
  dosage: z.string().trim().min(1, "Dosage is required"),
});

type FormValues = z.infer<typeof schema>;

export function VisitPrescriptions({
  visitId,
  prescriptions,
  visitFinished,
  onChanged,
}: {
  visitId: string;
  prescriptions: Prescription[];
  visitFinished: boolean;
  onChanged: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => prescriptionsApi.deletePrescription(id),
    onSuccess: (message) => {
      toast.success(message);
      setDeleteTarget(null);
      onChanged();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete prescription");
      setDeleteTarget(null);
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Prescriptions</CardTitle>
        {/* Writes return 403 once the visit is finished, so the controls go away. */}
        {!visitFinished ? (
          <Can permission="prescription.create">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Prescribe
            </Button>
          </Can>
        ) : null}
      </CardHeader>

      {prescriptions.length === 0 ? (
        <EmptyState
          className="border-0"
          title="Nothing prescribed"
          description={
            visitFinished
              ? "No medication was prescribed during this visit."
              : "Add medication issued during this visit."
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {prescriptions.map((prescription) => {
            const actions: RowAction[] = [
              {
                key: "edit",
                label: "Edit",
                icon: Pencil,
                permission: "prescription.update",
                available: !visitFinished,
                onSelect: () => {
                  setEditing(prescription);
                  setFormOpen(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                permission: "prescription.delete",
                available: !visitFinished,
                destructive: true,
                onSelect: () => setDeleteTarget(prescription),
              },
            ];

            return (
              <div key={prescription.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{prescription.medicine}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {prescription.dosage}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(prescription.createdAt)}
                  </p>
                </div>
                <RowActionMenu actions={actions} label={`Actions for ${prescription.medicine}`} />
              </div>
            );
          })}
        </div>
      )}

      <PrescriptionDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        visitId={visitId}
        prescription={editing}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this prescription?"
        description={deleteTarget ? `${deleteTarget.medicine} will be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Card>
  );
}

function PrescriptionDialog({
  open,
  onOpenChange,
  visitId,
  prescription,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  prescription: Prescription | null;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      medicine: prescription?.medicine ?? "",
      dosage: prescription?.dosage ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      if (prescription) {
        await prescriptionsApi.updatePrescription(prescription.id, values);
      } else {
        // The create response is the whole visit with its prescriptions, so the
        // detail query is refetched instead of being patched by hand.
        await prescriptionsApi.createPrescription(visitId, values);
      }
      toast.success(prescription ? "Prescription updated" : "Prescription added");
      onOpenChange(false);
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{prescription ? "Edit prescription" : "New prescription"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Medicine" htmlFor="medicine" error={errors.medicine?.message} required>
            <Input
              id="medicine"
              placeholder="e.g. Amoxicillin 500mg"
              aria-invalid={Boolean(errors.medicine)}
              {...register("medicine")}
            />
          </Field>

          <Field label="Dosage" htmlFor="dosage" error={errors.dosage?.message} required>
            <Input
              id="dosage"
              placeholder="e.g. 1 capsule every 8 hours for 5 days"
              aria-invalid={Boolean(errors.dosage)}
              {...register("dosage")}
            />
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
              {prescription ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
