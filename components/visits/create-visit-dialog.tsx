"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { PatientPicker } from "@/components/appointments/patient-picker";
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
import { Textarea } from "@/components/ui/textarea";
import * as visitsApi from "@/lib/api/visits";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import type { Patient } from "@/lib/types";

/**
 * Every field is optional on the server, but a visit with nothing on it is not
 * useful, so the chief complaint is required here.
 *
 * Pass `patientId` + `patientName` to lock the patient (patient chart). Omit
 * them to let the doctor pick a patient (My visits).
 */
const schema = z.object({
  title: z.string().trim().optional(),
  chiefComplaint: z.string().trim().min(1, "Chief complaint is required"),
  clinicalFindings: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateVisitDialog({
  open,
  onOpenChange,
  patientId: lockedPatientId,
  patientName: lockedPatientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: number;
  patientName?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientLocked = lockedPatientId != null;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientError, setPatientError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setPatient(null);
    setPatientError(null);
    reset();
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    const patientId = patientLocked ? lockedPatientId : patient?.id;
    if (!patientId) {
      setPatientError("Select a patient");
      return;
    }
    setPatientError(null);

    try {
      // The dentist is always the caller; there is no dentistId to send.
      const visit = await visitsApi.createVisit(patientId, {
        title: values.title || undefined,
        chiefComplaint: values.chiefComplaint,
        clinicalFindings: values.clinicalFindings || undefined,
        diagnosis: values.diagnosis || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Visit opened");
      reset();
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      router.push(`/visits/${visit.id}`);
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  const patientLabel = patientLocked
    ? lockedPatientName ?? "this patient"
    : patient?.fullName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a visit</DialogTitle>
          <DialogDescription>
            {patientLabel
              ? `Recorded against ${patientLabel}, with you as the treating dentist.`
              : "Pick a patient, then record the visit with you as the treating dentist."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {!patientLocked ? (
            <Field label="Patient" error={patientError ?? undefined} required>
              <PatientPicker
                value={patient}
                onChange={(next) => {
                  setPatient(next);
                  setPatientError(null);
                }}
                invalid={Boolean(patientError)}
              />
            </Field>
          ) : null}

          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="Optional short label" {...register("title")} />
          </Field>

          <Field
            label="Chief complaint"
            htmlFor="chiefComplaint"
            error={errors.chiefComplaint?.message}
            required
          >
            <Textarea
              id="chiefComplaint"
              rows={2}
              aria-invalid={Boolean(errors.chiefComplaint)}
              {...register("chiefComplaint")}
            />
          </Field>

          <Field
            label="Clinical findings"
            htmlFor="clinicalFindings"
            error={errors.clinicalFindings?.message}
          >
            <Textarea id="clinicalFindings" rows={2} {...register("clinicalFindings")} />
          </Field>

          <Field label="Diagnosis" htmlFor="diagnosis" error={errors.diagnosis?.message}>
            <Input id="diagnosis" {...register("diagnosis")} />
          </Field>

          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={2} {...register("notes")} />
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
              Open visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
