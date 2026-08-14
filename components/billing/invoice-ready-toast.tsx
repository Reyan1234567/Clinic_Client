"use client";

import Link from "next/link";
import { Receipt, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type InvoiceReadyPayload = {
  invoiceId: string;
  invoiceNumber: string;
  total: string;
  visitId: string;
  patientId: number;
  patientName: string;
  dentistId: string;
  dentistName: string;
};

/** Toast when a doctor closes a visit and an unpaid invoice is ready. */
export function showInvoiceReadyToast(payload: InvoiceReadyPayload) {
  toast.custom(
    (id) => (
      <div
        className={cn(
          "flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 border border-primary/40 bg-card p-3 shadow-none",
        )}
        role="status"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
          <Receipt className="h-3.5 w-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="tech-label text-primary">Ready to collect</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {payload.patientName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {payload.invoiceNumber} · {formatMoney(payload.total)}
            {payload.dentistName ? ` · ${payload.dentistName}` : ""}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <Button asChild size="sm" className="h-7 px-2.5 text-xs">
              <Link
                href={`/billing?invoice=${payload.invoiceId}`}
                onClick={() => toast.dismiss(id)}
              >
                Open bill
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
      duration: 14_000,
      unstyled: true,
      className: "p-0! bg-transparent! border-0! shadow-none!",
    },
  );
}
