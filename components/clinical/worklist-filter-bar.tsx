"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type WorklistFilters = {
  patientName: string;
  patientNumber: string;
  mobile: string;
};

export function WorklistFilterBar({
  value,
  onChange,
  onRefresh,
  refreshing,
  className,
}: {
  value: WorklistFilters;
  onChange: (next: WorklistFilters) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}) {
  const set = (key: keyof WorklistFilters, next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 border border-[var(--clinical-border)] bg-[var(--clinical-panel)] px-3 py-2.5",
        className,
      )}
    >
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="clinical-label">Patient name</span>
        <Input
          value={value.patientName}
          onChange={(e) => set("patientName", e.target.value)}
          className="h-8 rounded-none border-[var(--clinical-border)] bg-[var(--clinical-input)] text-[var(--clinical-fg)]"
          placeholder="Name"
        />
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1">
        <span className="clinical-label">Patient #</span>
        <Input
          value={value.patientNumber}
          onChange={(e) => set("patientNumber", e.target.value)}
          className="h-8 rounded-none border-[var(--clinical-border)] bg-[var(--clinical-input)] font-mono text-[var(--clinical-fg)]"
          placeholder="P-…"
        />
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1">
        <span className="clinical-label">Mobile</span>
        <Input
          value={value.mobile}
          onChange={(e) => set("mobile", e.target.value)}
          className="h-8 rounded-none border-[var(--clinical-border)] bg-[var(--clinical-input)] font-mono text-[var(--clinical-fg)]"
          placeholder="09…"
        />
      </label>
      {onRefresh ? (
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-none border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-600"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}

export function matchWorklistFilters(
  filters: WorklistFilters,
  row: {
    fullName?: string | null;
    patientNumber?: string | null;
    phone?: string | null;
  },
) {
  const name = filters.patientName.trim().toLowerCase();
  const number = filters.patientNumber.trim().toLowerCase();
  const mobile = filters.mobile.trim().toLowerCase();
  if (name && !(row.fullName ?? "").toLowerCase().includes(name)) return false;
  if (number && !(row.patientNumber ?? "").toLowerCase().includes(number)) return false;
  if (mobile && !(row.phone ?? "").toLowerCase().includes(mobile)) return false;
  return true;
}
