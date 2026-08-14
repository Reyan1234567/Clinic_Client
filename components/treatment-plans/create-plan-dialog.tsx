"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import * as plansApi from "@/lib/api/treatment-plans";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";

const schema = z.object({
  title: z.string().trim().min(1, "Give the plan a title"),
  description: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreatePlanDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (values) => {
    try {
      const plan = await plansApi.createTreatmentPlan(patientId, {
        title: values.title,
        description: values.description || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
      toast.success("Treatment plan created");
      reset();
      onOpenChange(false);
      router.push(`/treatment-plans/${plan.id}`);
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New treatment plan</DialogTitle>
          <DialogDescription>For {patientName}. Items are added afterwards.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Title" htmlFor="plan-title" error={errors.title?.message} required>
            <Input
              id="plan-title"
              placeholder="e.g. Upper arch restoration"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
          </Field>

          <Field label="Description" htmlFor="plan-description" error={errors.description?.message}>
            <Textarea id="plan-description" rows={3} {...register("description")} />
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
              Create plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
