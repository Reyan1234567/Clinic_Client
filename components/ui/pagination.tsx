"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pagination as PaginationMeta } from "@/lib/types";

/**
 * Note the asymmetry in the API: /patients and /appointments accept `pageSize`
 * while every other list accepts `limit`, yet all of them report `limit` in
 * meta. This component only reads meta, so it works for both.
 */
export function Pagination({
  meta,
  onPageChange,
  className,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const from = meta.totalCount === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.totalCount);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5 ${className ?? ""}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {from}–{to} of {meta.totalCount}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Page {meta.page} / {meta.totalPage}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={!meta.hasPrevPage}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
