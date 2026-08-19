"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { CatalogCategoriesDialog } from "@/components/catalog/catalog-categories-dialog";
import { CatalogFormDialog } from "@/components/catalog/catalog-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
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
import { formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type CatalogItem } from "@/lib/types";

const PAGE_SIZE = 10;

export default function CatalogPage() {
  return (
    <RequirePermission anyOf={["catalog.read"]} redirectTo="/dashboard">
      <CatalogScreen />
    </RequirePermission>
  );
}

function CatalogScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const params = { page, limit: PAGE_SIZE, search: debouncedSearch || undefined };

  const query = useQuery({
    queryKey: queryKeys.catalog(params),
    queryFn: () => catalogApi.listCatalog(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["catalog"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.deleteCatalogItem(id),
    onSuccess: (message) => {
      toast.success(message);
      setDeleting(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete the item");
      setDeleting(null);
    },
  });

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin / Catalog"
        title="Treatment catalog"
        description="List prices used by plans, planned procedures and visit procedures."
      >
        <Can permission="catalog.update">
          <Button size="sm" variant="outline" onClick={() => setCategoriesOpen(true)}>
            Categories
          </Button>
        </Can>
        <Can permission="catalog.create">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add items
          </Button>
        </Can>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search treatments"
        />
      </div>

      <Card>
        {query.isPending ? (
          <TableSkeleton columns={3} />
        ) : query.isError ? (
          <ErrorState className="border-0" error={query.error} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching treatments" : "The catalog is empty"}
            description={
              debouncedSearch
                ? "Try a different search term."
                : "Add the treatments your clinic offers so they can be priced consistently."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-32 text-right">Price</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const actions: RowAction[] = [
                    {
                      key: "edit",
                      label: "Edit",
                      icon: Pencil,
                      permission: "catalog.update",
                      onSelect: () => setEditing(item),
                    },
                    {
                      key: "delete",
                      label: "Delete",
                      icon: Trash2,
                      permission: "catalog.delete",
                      destructive: true,
                      separatorBefore: true,
                      onSelect: () => setDeleting(item),
                    },
                  ];

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        {item.description ? (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.category.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatMoney(item.price)}
                      </TableCell>
                      <TableCell>
                        <RowActionMenu actions={actions} label={`Actions for ${item.name}`} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : null}
          </>
        )}
      </Card>

      <CatalogFormDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />
      <CatalogCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      {editing ? (
        <CatalogFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          item={editing}
          onDone={invalidate}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this catalog item?"
        description={
          deleting
            ? `"${deleting.name}" is soft-deleted, so past procedures that reference it keep their prices.`
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
