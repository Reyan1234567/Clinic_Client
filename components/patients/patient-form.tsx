"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import type { PatientInput } from "@/lib/api/patients";
import { ageFromDateOfBirth, toDateKey, todayKey } from "@/lib/format";
import type { Patient } from "@/lib/types";

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().min(6, "A valid phone number is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")
    .superRefine((value, ctx) => {
      const [year, month, day] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date of birth" });
        return;
      }
      if (value > todayKey()) {
        ctx.addIssue({
          code: "custom",
          message: "Date of birth cannot be in the future",
        });
        return;
      }
      const age = ageFromDateOfBirth(value);
      if (age === null || age < 0 || age > 150) {
        ctx.addIssue({ code: "custom", message: "Date of birth looks wrong" });
      }
    }),
  address: z.string().trim().min(2, "Address is required"),
});

type FormValues = z.input<typeof schema>;

export function PatientForm({
  patient,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  patient?: Patient;
  submitLabel: string;
  onSubmit: (values: PatientInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
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
      fullName: patient?.fullName ?? "",
      phone: patient?.phone ?? "",
      gender: patient?.gender ?? "MALE",
      dateOfBirth: patient?.dateOfBirth ? toDateKey(patient.dateOfBirth) : "",
      address: patient?.address ?? "",
    },
  });

  const gender = useWatch({ control, name: "gender" });
  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });
  const agePreview = ageFromDateOfBirth(dateOfBirth || undefined);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(schema.parse(values));
    } catch (error) {
      // 422 details are keyed by field name, so they land on the inputs.
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="fullName"
            error={errors.fullName?.message}
            required
            className="sm:col-span-2"
          >
            <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
          </Field>

          <Field label="Phone" htmlFor="phone" error={errors.phone?.message} required>
            <Input
              id="phone"
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
          </Field>

          <Field
            label="Date of birth"
            htmlFor="dateOfBirth"
            error={errors.dateOfBirth?.message}
            required
            hint={
              agePreview !== null
                ? `Age today: ${agePreview} year${agePreview === 1 ? "" : "s"}`
                : "Used to compute age."
            }
          >
            <Input
              id="dateOfBirth"
              type="date"
              max={todayKey()}
              aria-invalid={Boolean(errors.dateOfBirth)}
              {...register("dateOfBirth")}
            />
          </Field>

          <Field label="Sex" error={errors.gender?.message} required>
            <Select
              value={gender}
              onValueChange={(value) => setValue("gender", value as "MALE" | "FEMALE")}
            >
              <SelectTrigger aria-invalid={Boolean(errors.gender)}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Address"
            htmlFor="address"
            error={errors.address?.message}
            required
            hint="Required by the server."
          >
            <Input id="address" aria-invalid={Boolean(errors.address)} {...register("address")} />
          </Field>

          {patient ? (
            <div className="sm:col-span-2">
              <span className="tech-label">Patient number</span>
              <p className="mt-0.5 font-mono text-sm">{patient.patientNumber}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generated by the server and cannot be changed.
              </p>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
