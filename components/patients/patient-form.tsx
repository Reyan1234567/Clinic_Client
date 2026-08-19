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
import {
  agePartsFromDateOfBirth,
  dateOfBirthFromAge,
  formatDateOnly,
} from "@/lib/format";
import { ApiError, type Patient } from "@/lib/types";

const optionalInt = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? fallback : value),
    z.coerce.number().int(),
  );

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().min(6, "A valid phone number is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  ageYears: optionalInt(NaN).pipe(z.number().min(0, "Enter age in years").max(150)),
  ageMonths: optionalInt(0).pipe(z.number().min(0).max(11, "Months must be 0–11")),
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
  const existingAge = agePartsFromDateOfBirth(patient?.dateOfBirth);
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
      ageYears: existingAge?.years ?? ("" as never),
      ageMonths: existingAge?.months ?? 0,
      address: patient?.address ?? "",
    },
  });

  const gender = useWatch({ control, name: "gender" });
  const ageYears = useWatch({ control, name: "ageYears" });
  const ageMonths = useWatch({ control, name: "ageMonths" });
  const yearsNum = Number(ageYears);
  const monthsNum = Number(ageMonths);
  const estimatedDob =
    Number.isFinite(yearsNum) &&
    yearsNum >= 0 &&
    yearsNum <= 150 &&
    Number.isFinite(monthsNum) &&
    monthsNum >= 0 &&
    monthsNum <= 11
      ? dateOfBirthFromAge(yearsNum, monthsNum)
      : null;

  const submit = handleSubmit(async (values) => {
    try {
      const parsed = schema.parse(values);
      await onSubmit({
        fullName: parsed.fullName,
        phone: parsed.phone,
        gender: parsed.gender,
        address: parsed.address,
        dateOfBirth: dateOfBirthFromAge(parsed.ageYears, parsed.ageMonths),
      });
    } catch (error) {
      applyApiErrorToForm(error, setError);
      if (error instanceof ApiError) {
        const dobMessage = error.fieldErrors?.dateOfBirth?.[0];
        if (dobMessage) {
          setError("ageYears", { type: "server", message: dobMessage });
        }
      }
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
            label="Age"
            htmlFor="ageYears"
            error={errors.ageYears?.message ?? errors.ageMonths?.message}
            required
            hint={
              estimatedDob
                ? `Saved as date of birth ${formatDateOnly(estimatedDob)}`
                : "Years and months; the server stores an estimated date of birth."
            }
          >
            <div className="flex gap-2">
              <Input
                id="ageYears"
                type="number"
                min={0}
                max={150}
                inputMode="numeric"
                placeholder="Years"
                aria-invalid={Boolean(errors.ageYears)}
                {...register("ageYears")}
              />
              <Input
                id="ageMonths"
                type="number"
                min={0}
                max={11}
                inputMode="numeric"
                placeholder="Months"
                aria-invalid={Boolean(errors.ageMonths)}
                {...register("ageMonths")}
              />
            </div>
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
