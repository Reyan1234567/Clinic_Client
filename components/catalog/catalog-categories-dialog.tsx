"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as catalogApi from "@/lib/api/catalog";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type CatalogCategory } from "@/lib/types";

export function CatalogCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<CatalogCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [deleting, setDeleting] = useState<CatalogCategory | null>(null);

  const query = useQuery({
    queryKey: queryKeys.catalogCategories,
    queryFn: catalogApi.listCategories,
    enabled: open,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const createMutation = useMutation({
    mutationFn: () => catalogApi.createCategory({ name: name.trim() }),
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not add category"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      catalogApi.updateCategory(editing!.id, { name: editName.trim() }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditing(null);
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.deleteCategory(id),
    onSuccess: (message) => {
      toast.success(message);
      setDeleting(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete category");
      setDeleting(null);
    },
  });

  const categories = query.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catalog categories</DialogTitle>
            <DialogDescription>
              Treatments pick from this list. Rename freely; delete only unused groups.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) createMutation.mutate();
            }}
          >
            <Field label="New category" htmlFor="new-category" className="flex-1">
              <Input
                id="new-category"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dental procedure"
              />
            </Field>
            <Button
              type="submit"
              size="sm"
              className="mt-6"
              disabled={createMutation.isPending || !name.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </form>

          {query.isPending ? (
            <TableSkeleton rows={4} columns={2} />
          ) : query.isError ? (
            <ErrorState
              className="border-0"
              error={query.error}
              onRetry={() => query.refetch()}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              className="border-0"
              title="No categories"
              description="Add a group before creating catalog treatments."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="text-sm">{category.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Rename ${category.name}`}
                          onClick={() => {
                            setEditing(category);
                            setEditName(category.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => setDeleting(category)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <Field label="Name" htmlFor="edit-category" required>
            <Input
              id="edit-category"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending || !editName.trim()}
              onClick={() => updateMutation.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this category?"
        description={
          deleting
            ? `"${deleting.name}" can only be removed if no treatments still use it.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  );
}
