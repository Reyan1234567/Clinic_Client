"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
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
import * as catalogApi from "@/lib/api/catalog";
import { CATALOG_CATEGORIES, type CatalogCategory } from "@/lib/catalog-categories";
import { formatEnum } from "@/lib/format";
import { ApiError, type CatalogItem } from "@/lib/types";

interface Draft {
  key: string;
  name: string;
  description: string;
  category: CatalogCategory | "";
  price: string;
}

const emptyDraft = (): Draft => ({
  key: Math.random().toString(36).slice(2),
  name: "",
  description: "",
  category: "",
  price: "",
});

/**
 * POST /catalog takes an array, so create supports several rows in one request.
 * PATCH /catalog/:id takes a single object, so edit is restricted to one.
 */
export function CatalogFormDialog({
  open,
  onOpenChange,
  item,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem | null;
  onDone: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    item
      ? [
          {
            key: item.id,
            name: item.name,
            description: item.description ?? "",
            category: item.category,
            price: item.price,
          },
        ]
      : [emptyDraft()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (key: string, patch: Partial<Draft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  };

  const submit = async () => {
    const filled = drafts.filter((draft) => draft.name.trim() || draft.price.trim());
    if (filled.length === 0) {
      setError("Add at least one item.");
      return;
    }

    for (const draft of filled) {
      if (!draft.name.trim()) {
        setError("Every item needs a name.");
        return;
      }
      if (!draft.category) {
        setError(`Choose a category for "${draft.name.trim() || "the new item"}".`);
        return;
      }
      const price = Number(draft.price);
      if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
        setError(`Enter a valid price for "${draft.name.trim() || "the new item"}".`);
        return;
      }
    }

    const payload = filled.map((draft): catalogApi.CatalogItemInput => {
      const category = draft.category;
      if (!category) {
        throw new Error(`Missing category for "${draft.name.trim()}"`);
      }

      return {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        category,
        price: Number(draft.price),
      };
    });

    setPending(true);
    setError(null);
    try {
      if (item) {
        await catalogApi.updateCatalogItem(item.id, payload[0]);
        toast.success("Catalog item updated");
      } else {
        const created = await catalogApi.createCatalogItems(payload);
        toast.success(
          created.length > 1 ? `${created.length} items added` : "Catalog item added",
        );
      }
      onOpenChange(false);
      onDone();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Could not save the catalog item",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit catalog item" : "Add catalog items"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Name, description and list price."
              : "Add one row per treatment. They are created in a single request."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto">
          {drafts.map((draft, index) => (
            <div key={draft.key} className="border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="tech-label">Item {index + 1}</span>
                {!item && drafts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((current) => current.filter((d) => d.key !== draft.key))
                    }
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Name" htmlFor={`name-${draft.key}`} required>
                  <Input
                    id={`name-${draft.key}`}
                    value={draft.name}
                    onChange={(event) => update(draft.key, { name: event.target.value })}
                  />
                </Field>
                <Field label="Category" htmlFor={`category-${draft.key}`} required>
                  <Select
                    value={draft.category || undefined}
                    onValueChange={(value) =>
                      update(draft.key, { category: value as CatalogCategory })
                    }
                  >
                    <SelectTrigger id={`category-${draft.key}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATALOG_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {formatEnum(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Price" htmlFor={`price-${draft.key}`} required>
                  <Input
                    id={`price-${draft.key}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={draft.price}
                    onChange={(event) => update(draft.key, { price: event.target.value })}
                  />
                </Field>
              </div>

              <Field
                label="Description"
                htmlFor={`description-${draft.key}`}
                className="mt-3"
              >
                <Textarea
                  id={`description-${draft.key}`}
                  rows={2}
                  value={draft.description}
                  onChange={(event) => update(draft.key, { description: event.target.value })}
                />
              </Field>
            </div>
          ))}

          {!item ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setDrafts((current) => [...current, emptyDraft()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another
            </Button>
          ) : null}

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
            {item ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
