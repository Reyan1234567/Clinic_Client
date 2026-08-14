"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { PatientPicker } from "@/components/appointments/patient-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
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
import type { AppointmentInput } from "@/lib/api/appointments";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { toUtcDateTime } from "@/lib/format";
import { ApiError, type Patient } from "@/lib/types";

const schema = z.object({
  dentistId: z.string().uuid("Choose a dentist"),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  purpose: z.string().trim().min(2, "Describe the purpose"),
});

type FormValues = z.infer<typeof schema>;

/**
 * The clinic has a single room, so date + time is globally unique and the
 * server answers 409 on a collision. That belongs on the time field, which is
 * the value the user has to change.
 *
 * Doctors without `user.readDentists` book for themselves — dentist is locked
 * to the signed-in user.
 */
export function BookingForm({
  initialPatient,
  initialDate,
  submitLabel = "Book appointment",
  onSubmit,
  onCancel,
}: {
  initialPatient?: Patient | null;
  initialDate?: string;
  submitLabel?: string;
  onSubmit: (input: AppointmentInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const { has } = usePermissions();
  const canListDentists = has("user.readDentists");
  const selfBooking = !canListDentists && Boolean(user?.id);

  const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);
  const [patientError, setPatientError] = useState<string | null>(null);

  const dentistsQuery = useQuery({
    queryKey: queryKeys.dentists,
    queryFn: usersApi.listDentists,
    enabled: canListDentists,
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dentistId: selfBooking && user ? user.id : "",
      date: initialDate ?? "",
      time: "",
      purpose: "",
    },
  });

  useEffect(() => {
    if (selfBooking && user?.id) {
      setValue("dentistId", user.id, { shouldValidate: true });
    }
  }, [selfBooking, user?.id, setValue]);

  const dentistId = useWatch({ control, name: "dentistId" });

  const submit = handleSubmit(async (values) => {
    if (!patient) {
      setPatientError("Select a patient");
      return;
    }
    setPatientError(null);

    try {
      await onSubmit({
        patientId: patient.id,
        dentistId: values.dentistId,
        appointmentTime: toUtcDateTime(values.date, values.time),
        purpose: values.purpose,
      });
    } catch (error) {
      applyApiErrorToForm(error, setError, {
        statusFieldMap: {
          409: "time",
          400: "dentistId",
          404: "dentistId",
        },
      });
    }
  });

  const dentistsForbidden =
    dentistsQuery.error instanceof ApiError && dentistsQuery.error.isForbidden;

  return (
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

      {selfBooking ? (
        <Field label="Dentist" hint="Booked for you." required>
          <div className="flex h-9 items-center border border-input bg-secondary/40 px-3 text-sm">
            {user?.fullName ?? "You"}
          </div>
          <input type="hidden" {...register("dentistId")} />
        </Field>
      ) : (
        <Field
          label="Dentist"
          error={errors.dentistId?.message}
          required
          hint={
            dentistsForbidden
              ? "You are not permitted to list dentists, so booking cannot be completed here."
              : undefined
          }
        >
          {dentistsQuery.isPending ? (
            <div className="flex h-9 items-center border border-input bg-card px-3">
              <InlineSpinner label="Loading dentists" />
            </div>
          ) : dentistsQuery.isError ? (
            <div className="flex h-9 items-center border border-destructive/40 bg-destructive/5 px-3 text-xs text-destructive">
              {dentistsForbidden ? "Not permitted" : "Could not load dentists"}
            </div>
          ) : (
            <Select
              value={dentistId}
              onValueChange={(value) => setValue("dentistId", value, { shouldValidate: true })}
            >
              <SelectTrigger aria-invalid={Boolean(errors.dentistId)}>
                <SelectValue placeholder="Select a dentist" />
              </SelectTrigger>
              <SelectContent>
                {dentistsQuery.data.map((dentist) => (
                  <SelectItem key={dentist.id} value={dentist.id}>
                    {dentist.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Date"
          htmlFor="appointment-date"
          error={errors.date?.message}
          required
        >
          <Input
            id="appointment-date"
            type="date"
            className="dark:[color-scheme:dark]"
            aria-invalid={Boolean(errors.date)}
            {...register("date")}
          />
        </Field>

        <Field
          label="Time"
          htmlFor="appointment-time"
          error={errors.time?.message}
          hint="24h HH:mm"
          required
        >
          <Input
            id="appointment-time"
            type="time"
            className="dark:[color-scheme:dark]"
            aria-invalid={Boolean(errors.time)}
            {...register("time")}
          />
        </Field>
      </div>

      <Field label="Purpose" htmlFor="purpose" error={errors.purpose?.message} required>
        <Input
          id="purpose"
          placeholder="e.g. Root canal follow-up"
          className="dark:[color-scheme:dark]"
          aria-invalid={Boolean(errors.purpose)}
          {...register("purpose")}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
