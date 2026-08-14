import { FolderOpen, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Green play / orange folder icon pair for worklist rows. */
export function WorklistIconActions({
  onPlay,
  onOpen,
  playLabel = "Start",
  openLabel = "Open record",
  playDisabled,
  className,
}: {
  onPlay?: () => void;
  onOpen?: () => void;
  playLabel?: string;
  openLabel?: string;
  playDisabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onPlay ? (
        <button
          type="button"
          aria-label={playLabel}
          title={playLabel}
          disabled={playDisabled}
          onClick={onPlay}
          className="inline-flex h-7 w-7 items-center justify-center border border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : null}
      {onOpen ? (
        <button
          type="button"
          aria-label={openLabel}
          title={openLabel}
          onClick={onOpen}
          className="inline-flex h-7 w-7 items-center justify-center border border-amber-800 bg-amber-600 text-white hover:bg-amber-500"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function ClinicalStatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "wait" | "active" | "done" | "booked";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        tone === "neutral" && "bg-[#3a3d42] text-[#c4c7cc]",
        tone === "booked" && "bg-sky-900/80 text-sky-200",
        tone === "wait" && "bg-amber-900/70 text-amber-100",
        tone === "active" && "bg-emerald-900/70 text-emerald-100",
        tone === "done" && "bg-blue-900/70 text-blue-100",
      )}
    >
      {children}
    </span>
  );
}

export function ClinicalLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--clinical-border)] bg-[var(--clinical-panel)] px-3 py-1.5 text-[10px] text-[var(--clinical-muted)]">
      <span className="clinical-label mr-1">Legend</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 bg-sky-600" /> Booked
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 bg-amber-600" /> Waiting
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 bg-emerald-600" /> In chair
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 bg-blue-600" /> Done
      </span>
    </div>
  );
}
