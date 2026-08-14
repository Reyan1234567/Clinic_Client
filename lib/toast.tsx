"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type AppToastOptions = {
  description?: string;
  duration?: number;
};

const TONE = {
  success: {
    label: "Success",
    Icon: CheckCircle2,
    shell: "border-success/40",
    iconWrap: "border-success/30 bg-success/10 text-success",
    labelClass: "text-success",
  },
  error: {
    label: "Error",
    Icon: CircleAlert,
    shell: "border-destructive/40",
    iconWrap: "border-destructive/30 bg-destructive/10 text-destructive",
    labelClass: "text-destructive",
  },
  info: {
    label: "Notice",
    Icon: Info,
    shell: "border-primary/40",
    iconWrap: "border-primary/30 bg-primary/10 text-primary",
    labelClass: "text-primary",
  },
} as const;

function showAppToast(tone: ToastTone, title: string, options?: AppToastOptions) {
  const config = TONE[tone];
  const Icon = config.Icon;

  return sonnerToast.custom(
    (id) => (
      <div
        className={cn(
          "flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 border bg-card p-3 shadow-none",
          config.shell,
        )}
        role="status"
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border",
            config.iconWrap,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn("tech-label", config.labelClass)}>{config.label}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
          {options?.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{options.description}</p>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => sonnerToast.dismiss(id)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
    {
      duration: options?.duration ?? (tone === "error" ? 7_000 : 4_000),
      unstyled: true,
      className: "p-0! bg-transparent! border-0! shadow-none!",
    },
  );
}

/**
 * App toast API — square tech-card chrome instead of Sonner’s rounded richColors.
 * Prefer this over importing `toast` from `sonner` directly.
 */
export const toast = {
  success: (title: string, options?: AppToastOptions) =>
    showAppToast("success", title, options),
  error: (title: string, options?: AppToastOptions) =>
    showAppToast("error", title, options),
  message: (title: string, options?: AppToastOptions) =>
    showAppToast("info", title, options),
  info: (title: string, options?: AppToastOptions) =>
    showAppToast("info", title, options),
  custom: sonnerToast.custom.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};
