"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { PatientPicker } from "@/components/appointments/patient-picker";
import { useAuth } from "@/components/providers/auth-provider";
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
import { InlineSpinner } from "@/components/ui/states";
import * as usersApi from "@/lib/api/users";
import * as visitsApi from "@/lib/api/visits";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Patient } from "@/lib/types";

const schema = z.object({
  dentistId: z.string().uuid("Choose a dentist"),
  title: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function WalkInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const canListDentists = has("user.readDentists");
  const selfAssign = !canListDentists && Boolean(user?.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientError, setPatientError] = useState<string | null>(null);

  const dentistsQuery = useQuery({
    queryKey: queryKeys.dentists,
    queryFn: usersApi.listDentists,
    enabled: open && canListDentists,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dentistId: "", title: "" },
  });

  const dentistId = useWatch({ control, name: "dentistId" });

  useEffect(() => {
    if (!open) return;
    setPatient(null);
    setPatientError(null);
    reset({
      dentistId: selfAssign && user ? user.id : "",
      title: "",
    });
  }, [open, reset, selfAssign, user]);

  const submit = handleSubmit(async (values) => {
    if (!patient) {
      setPatientError("Select a patient");
      return;
    }

    try {
      await visitsApi.createWalkInVisit({
        patientId: patient.id,
        dentistId: values.dentistId,
        title: values.title || undefined,
      });
      toast.success(`${patient.fullName} is waiting`);
      void queryClient.invalidateQueries({ queryKey: ["visits"] });
      onOpenChange(false);
    } catch (error) {
      applyApiErrorToForm(error, setError);
      if (!(error instanceof ApiError) || !error.isValidation) {
        toast.error(error instanceof ApiError ? error.message : "Could not add walk-in");
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Walk-in</DialogTitle>
          <DialogDescription>
            Adds the patient to the waiting list. No appointment is created.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
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

          {selfAssign ? (
            <Field label="Dentist" hint="Assigned to you." required>
              <div className="flex h-9 items-center border border-input bg-secondary/40 px-3 text-sm">
                {user?.fullName ?? "You"}
              </div>
            </Field>
          ) : (
            <Field label="Dentist" error={errors.dentistId?.message} required>
              {dentistsQuery.isPending ? (
                <div className="flex h-9 items-center border border-input px-3">
                  <InlineSpinner label="Loading dentists" />
                </div>
              ) : (
                <Select
                  value={dentistId}
                  onValueChange={(value) =>
                    setValue("dentistId", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger aria-invalid={Boolean(errors.dentistId)}>
                    <SelectValue placeholder="Select a dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dentistsQuery.data ?? []).map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}

          <Field label="Purpose" htmlFor="walk-in-purpose" hint="Optional.">
            <Input id="walk-in-purpose" placeholder="e.g. Tooth pain" {...register("title")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add to waiting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
