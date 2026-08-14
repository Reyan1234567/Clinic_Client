"use client";

import { cn } from "@/lib/utils";

export function ClinicalTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-0 border border-[var(--clinical-border)] bg-[var(--clinical-panel)]",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "border-r border-[var(--clinical-border)] px-4 py-2 text-sm last:border-r-0",
              active
                ? "bg-[var(--clinical-tab-active)] text-primary-foreground"
                : "bg-transparent text-[var(--clinical-muted)] hover:bg-[var(--clinical-row-hover)] hover:text-[var(--clinical-fg)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Secondary button row — use `end` for right-aligned actions (e.g. Close / Delete). */
export function ClinicalActionRow({
  children,
  end,
  className,
}: {
  children: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-1.5",
        className,
      )}
    >
      <div className="flex flex-wrap gap-1">{children}</div>
      {end ? <div className="flex flex-wrap gap-1">{end}</div> : null}
    </div>
  );
}

export function ClinicalActionButton({
  children,
  active,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-[7rem] border px-3 py-1.5 text-xs disabled:opacity-40",
        tone === "success" &&
          "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-600",
        tone === "danger" &&
          "border-red-800 bg-red-900/80 text-red-100 hover:bg-red-800",
        tone === "default" &&
          (active
            ? "border-[var(--clinical-tab-active)] bg-[var(--clinical-tab-active)] text-primary-foreground"
            : "border-[var(--clinical-border)] bg-[var(--clinical-btn)] text-[var(--clinical-fg)] hover:bg-[var(--clinical-row-hover)]"),
      )}
    >
      {children}
    </button>
  );
}
