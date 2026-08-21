"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CERTIFICATE_LABELS, defaultCertificateData } from "@/lib/certificates";
import type {
  BiopsyRequestData,
  CertificateData,
  CertificateType,
  MedicalCertificateData,
  ReferralFormData,
  VisitDetail,
} from "@/lib/types";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const biopsySchema = z.object({
  requestingDoctorName: z.string().trim().min(1, "Required"),
  requestingDoctorPhone: z.string().trim().min(1, "Required"),
  history: z.string().trim().min(1, "Required"),
  clinicalAppearance: z.string().trim().min(1, "Required"),
  lesionLocation: z.string().trim().min(1, "Required"),
  biopsyType: z.enum(["INCISIONAL", "EXCISIONAL"]),
  biopsyDate: dateKey,
  clinicalImpression: z.string().trim().min(1, "Required"),
});

const medicalSchema = z.object({
  diagnosis: z.string().trim().min(1, "Required"),
  treatedFrom: dateKey,
  treatedTo: dateKey,
  restRequiredDays: z.string().trim().min(1, "Required"),
  remark: z.string().trim(),
});

const referralSchema = z.object({
  historyExamInvestigation: z.string().trim().min(1, "Required"),
  diagnosticImpression: z.string().trim().min(1, "Required"),
  treatmentGiven: z.string().trim().min(1, "Required"),
  reasonForReferral: z.string().trim().min(1, "Required"),
  feedback: z.string().trim(),
});

export function CertificateFormDialog({
  open,
  onOpenChange,
  visit,
  type,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: VisitDetail;
  type: CertificateType;
  initial?: CertificateData | null;
  pending: boolean;
  onSubmit: (data: CertificateData) => void;
}) {
  const defaults = initial ?? defaultCertificateData(type, visit);

  if (type === "BIOPSY_REQUEST") {
    return (
      <BiopsyForm
        open={open}
        onOpenChange={onOpenChange}
        defaults={defaults as BiopsyRequestData}
        pending={pending}
        onSubmit={onSubmit}
      />
    );
  }
  if (type === "MEDICAL_CERTIFICATE") {
    return (
      <MedicalForm
        open={open}
        onOpenChange={onOpenChange}
        defaults={defaults as MedicalCertificateData}
        pending={pending}
        onSubmit={onSubmit}
      />
    );
  }
  return (
    <ReferralForm
      open={open}
      onOpenChange={onOpenChange}
      defaults={defaults as ReferralFormData}
      pending={pending}
      onSubmit={onSubmit}
    />
  );
}

function BiopsyForm({
  open,
  onOpenChange,
  defaults,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: BiopsyRequestData;
  pending: boolean;
  onSubmit: (data: CertificateData) => void;
}) {
  const form = useForm<BiopsyRequestData>({
    resolver: zodResolver(biopsySchema),
    defaultValues: defaults,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{CERTIFICATE_LABELS.BIOPSY_REQUEST}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Requesting doctor"
              error={form.formState.errors.requestingDoctorName?.message}
              required
            >
              <Input {...form.register("requestingDoctorName")} />
            </Field>
            <Field
              label="Phone"
              error={form.formState.errors.requestingDoctorPhone?.message}
              required
            >
              <Input {...form.register("requestingDoctorPhone")} />
            </Field>
          </div>
          <Field
            label="Physical examination / history"
            error={form.formState.errors.history?.message}
            required
          >
            <Textarea {...form.register("history")} />
          </Field>
          <Field
            label="Clinical appearance"
            error={form.formState.errors.clinicalAppearance?.message}
            required
          >
            <Textarea {...form.register("clinicalAppearance")} />
          </Field>
          <Field
            label="Lesion location"
            error={form.formState.errors.lesionLocation?.message}
            required
          >
            <Input {...form.register("lesionLocation")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type of biopsy" required>
              <select
                className="flex h-9 w-full border border-input bg-card px-3 text-sm"
                {...form.register("biopsyType")}
              >
                <option value="INCISIONAL">Incisional</option>
                <option value="EXCISIONAL">Excisional</option>
              </select>
            </Field>
            <Field
              label="Biopsy date"
              error={form.formState.errors.biopsyDate?.message}
              required
            >
              <Input type="date" {...form.register("biopsyDate")} />
            </Field>
          </div>
          <Field
            label="Clinical impression"
            error={form.formState.errors.clinicalImpression?.message}
            required
          >
            <Textarea {...form.register("clinicalImpression")} />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MedicalForm({
  open,
  onOpenChange,
  defaults,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: MedicalCertificateData;
  pending: boolean;
  onSubmit: (data: CertificateData) => void;
}) {
  const form = useForm<MedicalCertificateData>({
    resolver: zodResolver(medicalSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
    // Reset once when the dialog opens so visit refreshes don't wipe typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{CERTIFICATE_LABELS.MEDICAL_CERTIFICATE}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field
            label="Diagnosis / የምርመራ ውጤት"
            error={form.formState.errors.diagnosis?.message}
            required
          >
            <Textarea {...form.register("diagnosis")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Treated from / ከ"
              error={form.formState.errors.treatedFrom?.message}
              required
            >
              <Input type="date" {...form.register("treatedFrom")} />
            </Field>
            <Field
              label="To / እስከ"
              error={form.formState.errors.treatedTo?.message}
              required
            >
              <Input type="date" {...form.register("treatedTo")} />
            </Field>
          </div>
          <Field
            label="Rest required / የሐኪም እረፍት"
            error={form.formState.errors.restRequiredDays?.message}
            required
          >
            <Input {...form.register("restRequiredDays")} />
          </Field>
          <Field label="Remark / አስተያየት">
            <Textarea {...form.register("remark")} />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReferralForm({
  open,
  onOpenChange,
  defaults,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: ReferralFormData;
  pending: boolean;
  onSubmit: (data: CertificateData) => void;
}) {
  const form = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
    // Reset once when the dialog opens so visit refreshes don't wipe typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{CERTIFICATE_LABELS.REFERRAL_FORM}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field
            label="History, examination and investigation"
            error={form.formState.errors.historyExamInvestigation?.message}
            required
          >
            <Textarea {...form.register("historyExamInvestigation")} />
          </Field>
          <Field
            label="Diagnostic impression"
            error={form.formState.errors.diagnosticImpression?.message}
            required
          >
            <Textarea {...form.register("diagnosticImpression")} />
          </Field>
          <Field
            label="Treatment given"
            error={form.formState.errors.treatmentGiven?.message}
            required
          >
            <Textarea {...form.register("treatmentGiven")} />
          </Field>
          <Field
            label="Reason for referral"
            error={form.formState.errors.reasonForReferral?.message}
            required
          >
            <Textarea {...form.register("reasonForReferral")} />
          </Field>
          <Field label="Feedback">
            <Textarea {...form.register("feedback")} />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
