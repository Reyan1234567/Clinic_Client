"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ProcessSelectorAction = {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

/**
 * Process selector — stacked full-width actions after picking a patient.
 */
export function ProcessSelectorDialog({
  open,
  onOpenChange,
  title = "Process selector",
  subtitle,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  actions: ProcessSelectorAction[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-none border-border bg-card p-0 sm:max-w-sm">
        <DialogHeader className="border-b border-border bg-muted px-3 py-2 text-left">
          <DialogTitle className="text-sm font-semibold text-foreground">{title}</DialogTitle>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-2 p-3">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                action.onSelect();
                onOpenChange(false);
              }}
              className={cn(
                "w-full border border-border bg-secondary px-4 py-3 text-left text-sm font-medium text-secondary-foreground",
                "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
