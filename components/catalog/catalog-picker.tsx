"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { InlineSpinner } from "@/components/ui/states";
import * as catalogApi from "@/lib/api/catalog";
import { formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CatalogPickerItem = Pick<CatalogItem, "id" | "name" | "description" | "price">;

/** Requires `catalog.read`; a 403 is reported inline rather than thrown away. */
export function CatalogPicker({
  value,
  onChange,
  invalid,
  placeholder = "Select a treatment",
  allowCustom = false,
  customSelected = false,
  onSelectCustom,
}: {
  value: CatalogPickerItem | null;
  onChange: (item: CatalogPickerItem) => void;
  invalid?: boolean;
  placeholder?: string;
  /** Adds a Custom row above search results. */
  allowCustom?: boolean;
  customSelected?: boolean;
  onSelectCustom?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const query = useQuery({
    queryKey: queryKeys.catalog({ search: debouncedSearch, limit: 10 }),
    queryFn: () => catalogApi.listCatalog({ search: debouncedSearch || undefined, limit: 10 }),
    enabled: open,
  });

  const label = customSelected ? "Custom" : value ? value.name : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 border border-input bg-card px-3 text-left text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring",
          invalid && "border-destructive",
        )}
      >
        <span className={cn("truncate", !value && !customSelected && "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))]">
        <div className="border-b border-border p-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search treatments" />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {allowCustom ? (
            <button
              type="button"
              onClick={() => {
                onSelectCustom?.();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-primary",
                  customSelected ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="min-w-0 flex-1 truncate">Custom</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                enter price
              </span>
            </button>
          ) : null}

          {query.isPending ? (
            <div className="px-2 py-3">
              <InlineSpinner label="Searching" />
            </div>
          ) : query.isError ? (
            <p className="px-2 py-3 text-xs text-destructive">
              {query.error instanceof ApiError && query.error.isForbidden
                ? "You are not permitted to read the catalog."
                : "Could not load the catalog."}
            </p>
          ) : query.data.data.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No treatments found.</p>
          ) : (
            query.data.data.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    !customSelected && value?.id === item.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatMoney(item.price)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
