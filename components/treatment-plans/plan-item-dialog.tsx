"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import * as plansApi from "@/lib/api/treatment-plans";
import * as usersApi from "@/lib/api/users";
import { toDateKey } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type PlanItemExpanded } from "@/lib/types";

const UNASSIGNED = "UNASSIGNED";

/**
 * Plan items are a titled stage (dentist + optional planned date + notes).
 * Catalog binding lives on planned procedures added afterward.
 */
export function PlanItemDialog({
  open,
  onOpenChange,
  treatmentPlanId,
  item,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanId: string;
  item?: PlanItemExpanded | null;
  onDone: () => void;
}) {
  const { has } = usePermissions();
  const [title, setTitle] = useState("");
  const [dentistId, setDentistId] = useState<string>(UNASSIGNED);
  const [plannedDate, setPlannedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canPickDentist = has("user.readDentists");

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setDentistId(item?.dentistId ?? UNASSIGNED);
    setPlannedDate(item?.plannedDate ? toDateKey(item.plannedDate) : "");
    setNotes(item?.notes ?? "");
    setError(null);
  }, [open, item]);

  const dentistsQuery = useQuery({
    queryKey: queryKeys.dentists,
    queryFn: usersApi.listDentists,
    enabled: open && canPickDentist,
  });

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setPending(true);
    setError(null);

    const payload = {
      title: trimmedTitle,
      dentistId: dentistId === UNASSIGNED ? undefined : dentistId,
      notes: notes.trim() || undefined,
      // Blank on edit leaves the existing planned date unchanged.
      ...(plannedDate ? { plannedDate } : {}),
    };

    try {
      if (item) {
        await plansApi.updatePlanItem(item.id, payload);
      } else {
        await plansApi.createPlanItem(treatmentPlanId, payload);
      }
      toast.success(item ? "Item updated" : "Item added");
      onOpenChange(false);
      onDone();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : "Could not save the plan item",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit plan item" : "Add plan item"}</DialogTitle>
          <DialogDescription>
            Name this stage of treatment. Bind catalog treatments when you add planned
            procedures.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Title" htmlFor="item-title" required>
            <Input
              id="item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Upper arch restorative"
            />
          </Field>

          <Field label="Planned date" htmlFor="item-planned-date" hint="Optional.">
            <Input
              id="item-planned-date"
              type="date"
              value={plannedDate}
              onChange={(event) => setPlannedDate(event.target.value)}
            />
          </Field>

          {canPickDentist ? (
            <Field label="Assigned dentist" hint="Optional.">
              {dentistsQuery.isPending ? (
                <div className="flex h-9 items-center border border-input bg-card px-3 text-xs text-muted-foreground">
                  Loading dentists
                </div>
              ) : dentistsQuery.isError ? (
                <div className="flex h-9 items-center border border-border bg-card px-3 text-xs text-muted-foreground">
                  Dentist list unavailable
                </div>
              ) : (
                <Select value={dentistId} onValueChange={setDentistId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {dentistsQuery.data.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          ) : null}

          <Field label="Notes" htmlFor="item-notes">
            <Textarea
              id="item-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          {error ? (
            <p
              className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {item ? "Save" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
