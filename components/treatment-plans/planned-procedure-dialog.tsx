"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { CatalogPicker } from "@/components/catalog/catalog-picker";
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
import * as plannedApi from "@/lib/api/plan-procedures";
import { formatMoney, MAX_MONEY } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import type { CatalogItem, PlannedProcedure } from "@/lib/types";

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().optional(),
    estimatedPrice: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    source: z.enum(["unset", "catalog", "custom"]),
  })
  .superRefine((values, ctx) => {
    if (values.source === "unset") {
      ctx.addIssue({
        code: "custom",
        message: "Choose a catalog treatment or Custom",
        path: ["source"],
      });
    }
    if (values.source === "custom") {
      if (!values.estimatedPrice?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Estimated price is required for custom procedures",
          path: ["estimatedPrice"],
        });
        return;
      }
      const price = Number(values.estimatedPrice);
      if (!Number.isFinite(price) || price < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid price",
          path: ["estimatedPrice"],
        });
      } else if (price > MAX_MONEY) {
        ctx.addIssue({
          code: "custom",
          message: `Price must be at most ${MAX_MONEY.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}`,
          path: ["estimatedPrice"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export function PlannedProcedureDialog({
  open,
  onOpenChange,
  treatmentPlanItemId,
  procedure,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentPlanItemId: string;
  procedure?: PlannedProcedure | null;
  onDone: () => void;
}) {
  const initialCustom = Boolean(procedure && !procedure.treatmentCatalogId);
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(() =>
    procedure?.treatmentCatalogId
      ? {
          id: procedure.treatmentCatalogId,
          name: procedure.title,
          description: procedure.description,
          price: procedure.estimatedPrice ?? "0",
        }
      : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: procedure?.title ?? "",
      description: procedure?.description ?? "",
      estimatedPrice: procedure?.estimatedPrice ?? "",
      notes: procedure?.notes ?? "",
      source: procedure
        ? procedure.treatmentCatalogId
          ? "catalog"
          : "custom"
        : "unset",
    },
  });

  const source = watch("source");
  const isCustom = source === "custom";
  const isCatalog = source === "catalog" && catalogItem;

  const selectCatalog = (item: CatalogItem) => {
    setCatalogItem(item);
    setValue("source", "catalog", { shouldValidate: true });
    setValue("title", item.name, { shouldValidate: true });
    if (item.description) {
      setValue("description", item.description);
    }
    setValue("estimatedPrice", item.price);
  };

  const selectCustom = () => {
    setCatalogItem(null);
    setValue("source", "custom", { shouldValidate: true });
    if (!initialCustom && !procedure) {
      setValue("estimatedPrice", "");
    }
  };

  const submit = handleSubmit(async (values) => {
    if (values.source === "catalog" && !catalogItem) {
      setError("source", { type: "manual", message: "Choose a catalog treatment or Custom" });
      return;
    }

    let price: number | undefined;
    if (values.source === "custom") {
      price = Number(values.estimatedPrice);
      if (!Number.isFinite(price)) {
        setError("estimatedPrice", { type: "manual", message: "Enter a number" });
        return;
      }
    }

    const payload = {
      title: values.title,
      description: values.description || undefined,
      treatmentCatalogId: values.source === "catalog" ? catalogItem!.id : null,
      estimatedPrice: values.source === "custom" ? price : undefined,
      notes: values.notes || undefined,
    };

    try {
      if (procedure) {
        await plannedApi.updatePlannedProcedure(procedure.id, payload);
      } else {
        await plannedApi.createPlannedProcedure(treatmentPlanItemId, {
          ...payload,
          treatmentCatalogId: payload.treatmentCatalogId ?? undefined,
        });
      }
      toast.success(procedure ? "Planned procedure updated" : "Planned procedure added");
      onOpenChange(false);
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {procedure ? "Edit planned procedure" : "Add planned procedure"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Catalog treatment"
            hint="Pick a catalog item for its price, or Custom to enter one."
            error={errors.source?.message}
            required
          >
            <CatalogPicker
              value={catalogItem}
              onChange={selectCatalog}
              allowCustom
              customSelected={isCustom}
              onSelectCustom={selectCustom}
              invalid={Boolean(errors.source)}
              placeholder="Select catalog or Custom"
            />
          </Field>

          {isCustom || isCatalog ? (
            <>
              <Field label="Title" htmlFor="planned-title" error={errors.title?.message} required>
                <Input
                  id="planned-title"
                  aria-invalid={Boolean(errors.title)}
                  {...register("title")}
                />
              </Field>

              {isCustom ? (
                <Field
                  label="Estimated price"
                  htmlFor="planned-price"
                  error={errors.estimatedPrice?.message}
                  required
                >
                  <Input
                    id="planned-price"
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={Boolean(errors.estimatedPrice)}
                    {...register("estimatedPrice")}
                  />
                </Field>
              ) : (
                <Field label="Estimated price" hint="From catalog.">
                  <div className="flex h-9 items-center border border-input bg-secondary/40 px-3 font-mono text-sm">
                    {formatMoney(catalogItem!.price)}
                  </div>
                </Field>
              )}

              <Field
                label="Description"
                htmlFor="planned-description"
                error={errors.description?.message}
              >
                <Textarea id="planned-description" rows={2} {...register("description")} />
              </Field>

              <Field label="Notes" htmlFor="planned-notes" error={errors.notes?.message}>
                <Textarea id="planned-notes" rows={2} {...register("notes")} />
              </Field>
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || source === "unset"}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {procedure ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
