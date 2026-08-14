"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { InlineSpinner } from "@/components/ui/states";
import * as patientsApi from "@/lib/api/patients";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Booking needs a patient, so this reads the patient list. Callers must only
 * render it for users holding `patient.read`; a 403 is still handled inline
 * because permissions can change mid-session.
 */
export function PatientPicker({
  value,
  onChange,
  invalid,
}: {
  value: Patient | null;
  onChange: (patient: Patient) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const query = useQuery({
    queryKey: queryKeys.patients({ search: debouncedSearch, pageSize: 8 }),
    queryFn: () => patientsApi.listPatients({ search: debouncedSearch || undefined, pageSize: 8 }),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 border border-input bg-card px-3 text-left text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring",
          invalid && "border-destructive",
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? `${value.fullName} · ${value.patientNumber}` : "Select a patient"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))]">
        <div className="border-b border-border p-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {query.isPending ? (
            <div className="px-2 py-3">
              <InlineSpinner label="Searching" />
            </div>
          ) : query.isError ? (
            <p className="px-2 py-3 text-xs text-destructive">
              {query.error instanceof ApiError && query.error.isForbidden
                ? "You are not permitted to look up patients."
                : "Could not load patients."}
            </p>
          ) : query.data.data.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No patients found.</p>
          ) : (
            query.data.data.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => {
                  onChange(patient);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    value?.id === patient.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{patient.fullName}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {patient.patientNumber}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
