"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { CatalogPicker } from "@/components/catalog/catalog-picker";
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
import * as visitsApi from "@/lib/api/visits";
import * as procedureApi from "@/lib/api/visit-procedures";
import { formatMoney, MAX_MONEY } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { CatalogItem } from "@/lib/types";

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    status: z.enum(["SUCCEEDED", "FAILED"]),
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
      if (!values.description?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Description is required for custom procedures",
          path: ["description"],
        });
      }
      if (!values.estimatedPrice?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Estimated price is required for custom procedures",
          path: ["estimatedPrice"],
        });
      } else {
        const price = Number(values.estimatedPrice);
        if (!Number.isFinite(price) || price <= 0) {
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
    }
  });

type FormValues = z.infer<typeof schema>;

/**
 * Two endpoints can record a procedure:
 *
 *  - `procedure.create` via POST /visit-procedures/from-visit/:visitId
 *  - `procedure.attach` via POST /visits/:visitId/procedure (catalog required)
 *
 * Description + estimated price are Custom-only. Catalog picks use the catalog
 * price (and optional catalog description) without exposing those fields.
 */
export function AddProcedureDialog({
  open,
  onOpenChange,
  visitId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string;
  onDone: () => void;
}) {
  const { has } = usePermissions();
  const canCreate = has("procedure.create");
  const allowCustom = canCreate;

  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);

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
    defaultValues: {
      status: "SUCCEEDED",
      source: "unset",
      title: "",
      description: "",
      estimatedPrice: "",
      notes: "",
    },
  });

  const status = useWatch({ control, name: "status" });
  const source = useWatch({ control, name: "source" });
  const isCustom = source === "custom";
  const isCatalog = source === "catalog" && catalogItem;

  const selectCatalog = (item: CatalogItem) => {
    setCatalogItem(item);
    setValue("source", "catalog", { shouldValidate: true });
    setValue("title", item.name, { shouldValidate: true });
    setValue("description", "");
    setValue("estimatedPrice", "");
  };

  const selectCustom = () => {
    if (!allowCustom) return;
    setCatalogItem(null);
    setValue("source", "custom", { shouldValidate: true });
    setValue("estimatedPrice", "");
  };

  const close = () => {
    reset({
      status: "SUCCEEDED",
      source: "unset",
      title: "",
      description: "",
      estimatedPrice: "",
      notes: "",
    });
    setCatalogItem(null);
    onOpenChange(false);
  };

  const submit = handleSubmit(async (values) => {
    if (values.source === "catalog" && !catalogItem) {
      setError("source", {
        type: "manual",
        message: "Choose a catalog treatment or Custom",
      });
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

    try {
      if (canCreate) {
        await procedureApi.createProcedureFromVisit(visitId, {
          title: values.title,
          status: values.status,
          treatmentCatalogId:
            values.source === "catalog" ? catalogItem!.id : undefined,
          description:
            values.source === "custom"
              ? values.description!.trim()
              : catalogItem?.description || undefined,
          estimatedPrice: values.source === "custom" ? price : undefined,
          notes: values.notes || undefined,
        });
      } else {
        // Attach path requires a catalog treatment.
        await visitsApi.attachProcedureToVisit(visitId, {
          treatmentCatalogId: catalogItem!.id,
          title: values.title,
          status: values.status.toLowerCase() as "pending" | "succeeded" | "failed",
          description: catalogItem?.description || undefined,
          notes: values.notes || undefined,
        });
      }

      toast.success("Procedure recorded");
      close();
      // Both endpoints answer without the procedure list, so the visit detail
      // is refetched rather than patched.
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add service</DialogTitle>
          <DialogDescription>
            Pick a catalog treatment (or custom). Leave Pending to resolve later with Done / Failed,
            or set the outcome now — that locks the line in one step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Catalog treatment"
            hint={
              allowCustom
                ? "Pick a catalog item for its price, or Custom to enter one."
                : "Pick the catalog treatment this procedure records."
            }
            error={errors.source?.message}
            required
          >
            <CatalogPicker
              value={catalogItem}
              onChange={selectCatalog}
              allowCustom={allowCustom}
              customSelected={isCustom}
              onSelectCustom={selectCustom}
              invalid={Boolean(errors.source)}
              placeholder={allowCustom ? "Select catalog or Custom" : "Select a treatment"}
            />
          </Field>

          {isCustom || isCatalog ? (
            <>
              <Field
                label="Title"
                htmlFor="procedure-title"
                error={errors.title?.message}
                required
              >
                <Input
                  id="procedure-title"
                  aria-invalid={Boolean(errors.title)}
                  {...register("title")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setValue("status", value as "SUCCEEDED" | "FAILED")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {isCustom ? (
                  <Field
                    label="Estimated price"
                    htmlFor="procedure-price"
                    error={errors.estimatedPrice?.message}
                    required
                  >
                    <Input
                      id="procedure-price"
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
              </div>

              {isCustom ? (
                <Field
                  label="Description"
                  htmlFor="procedure-description"
                  error={errors.description?.message}
                  required
                >
                  <Textarea
                    id="procedure-description"
                    rows={2}
                    aria-invalid={Boolean(errors.description)}
                    {...register("description")}
                  />
                </Field>
              ) : null}

              <Field label="Notes" htmlFor="procedure-notes" error={errors.notes?.message}>
                <Textarea id="procedure-notes" rows={2} {...register("notes")} />
              </Field>
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || source === "unset"}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
