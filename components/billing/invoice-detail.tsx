"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as billingApi from "@/lib/api/billing";
import { formatDateTime, formatEnum, formatMoney, parseMoney } from "@/lib/format";
import { ApiError, type Invoice, type PaymentMethod } from "@/lib/types";

export function InvoiceDetail({
  invoice,
  onPaid,
}: {
  invoice: Invoice;
  onPaid: () => void;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const paid = useMemo(
    () => invoice.payments.reduce((sum, payment) => sum + parseMoney(payment.amount), 0),
    [invoice.payments],
  );
  const remaining = Math.max(0, parseMoney(invoice.total) - paid);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="tech-label">Patient</p>
          <p className="text-sm font-medium">{invoice.patient.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{invoice.patient.phone}</p>
        </div>
        <div>
          <p className="tech-label">Balance</p>
          <p className="font-mono text-sm">{formatMoney(remaining)}</p>
          <p className="text-xs text-muted-foreground">
            Paid {formatMoney(paid)} of {formatMoney(invoice.total)} · {formatEnum(invoice.status)}
          </p>
        </div>
      </div>

      {invoice.visit ? (
        <p className="text-xs text-muted-foreground">
          Visit · {invoice.visit.title || "Untitled"} · {invoice.visit.dentist.fullName}
        </p>
      ) : null}

      <div>
        <p className="tech-label mb-2">Services</p>
        <ul className="divide-y divide-border border border-border">
          {invoice.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{item.description}</span>
              <span className="shrink-0 font-mono text-xs">{formatMoney(item.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      {invoice.payments.length > 0 ? (
        <div>
          <p className="tech-label mb-2">Payments</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-2">
                <span>
                  {formatEnum(payment.paymentMethod)} · {formatDateTime(payment.paymentDate)}
                  {payment.receivedBy ? ` · ${payment.receivedBy.fullName}` : ""}
                </span>
                <span className="font-mono">{formatMoney(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {remaining > 0 ? (
        <Can permission="payment.create">
          <Button size="sm" onClick={() => setPayOpen(true)}>
            Record payment
          </Button>
        </Can>
      ) : (
        <p className="text-sm text-success">Fully paid</p>
      )}

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoiceId={invoice.id}
        remaining={remaining}
        onDone={() => {
          setPayOpen(false);
          onPaid();
        }}
      />
    </div>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  remaining,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  remaining: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.createPayment({
        invoiceId,
        amount: Number(amount),
        paymentMethod: method,
        referenceNumber: reference.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not record payment"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setAmount(String(remaining));
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Amount" required>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Method" required>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="TELEBIRR">Telebirr</SelectItem>
                <SelectItem value="CBE_BIRR">CBE Birr</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
