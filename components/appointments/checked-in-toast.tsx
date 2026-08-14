"use client";

import Link from "next/link";
import { LogIn, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppointmentCheckedInPayload = {
  appointmentId: string;
  patientId: number;
  patientName: string;
  appointmentTime: string | null;
  purpose: string;
  dentistId: string;
  status: string;
  checkedInAt: string | null;
  visitId?: string;
};

/**
 * Realtime check-in notice styled like the app's tech cards — not Sonner's
 * default rounded / richColors look.
 */
export function showCheckedInToast(payload: AppointmentCheckedInPayload) {
  const when = payload.appointmentTime ? payload.appointmentTime : null;

  toast.custom(
    (id) => (
      <div
        className={cn(
          "flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 border border-primary/40 bg-card p-3 shadow-none",
        )}
        role="status"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
          <LogIn className="h-3.5 w-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="tech-label text-primary">Checked in</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {payload.patientName}
            {when ? (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {" "}
                · {when}
              </span>
            ) : null}
          </p>
          {payload.purpose ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{payload.purpose}</p>
          ) : null}

          <div className="mt-2.5 flex items-center gap-2">
            <Button asChild size="sm" className="h-7 px-2.5 text-xs">
              <Link
                href={payload.visitId ? `/visits/${payload.visitId}` : `/appointments/${payload.appointmentId}`}
                onClick={() => toast.dismiss(id)}
              >
                {payload.visitId ? "Open visit" : "Open appointment"}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => toast.dismiss(id)}
            >
              Dismiss
            </Button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => toast.dismiss(id)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
    {
      duration: 12_000,
      unstyled: true,
      className: "p-0! bg-transparent! border-0! shadow-none!",
    },
  );
}
