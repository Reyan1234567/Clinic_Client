"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as billingApi from "@/lib/api/billing";
import { formatDateTime, formatEnum, formatMoney, parseMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Invoice, type PaymentMethod } from "@/lib/types";

export default function BillingPage() {
  return (
    <RequirePermission anyOf={["invoice.read"]} redirectTo="/dashboard">
      <BillingScreen />
    </RequirePermission>
  );
}

function BillingScreen() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const invoiceFromUrl = searchParams.get("invoice");
  const [selectedId, setSelectedId] = useState<string | null>(invoiceFromUrl);

  useEffect(() => {
    if (invoiceFromUrl) setSelectedId(invoiceFromUrl);
  }, [invoiceFromUrl]);

  const listQuery = useQuery({
    queryKey: queryKeys.invoices({ dueOnly: true, limit: 50 }),
    queryFn: () => billingApi.listInvoices({ dueOnly: true, limit: 50 }),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.invoice(selectedId ?? ""),
    queryFn: () => billingApi.getInvoice(selectedId!),
    enabled: Boolean(selectedId),
  });

  const invoices = listQuery.data?.data ?? [];
  const selected = detailQuery.data ?? invoices.find((row) => row.id === selectedId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  };

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow="Front desk"
        title="To collect"
        description="Closed visits with unpaid or partially paid invoices."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Due invoices</CardTitle>
          </CardHeader>
          {listQuery.isPending ? (
            <TableSkeleton rows={5} columns={4} />
          ) : listQuery.isError ? (
            <ErrorState
              className="border-0"
              error={listQuery.error}
              onRetry={() => listQuery.refetch()}
            />
          ) : invoices.length === 0 ? (
            <EmptyState
              className="border-0"
              title="Nothing to collect"
              description="When a doctor closes a visit with succeeded services, the invoice appears here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={selectedId === invoice.id ? "bg-accent/40" : undefined}
                    onClick={() => setSelectedId(invoice.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      <button type="button" className="text-left hover:underline">
                        {invoice.invoiceNumber}
                      </button>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDateTime(invoice.generatedAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{invoice.patient.fullName}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {invoice.patient.patientNumber}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{formatEnum(invoice.status)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatMoney(invoice.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Invoice detail</CardTitle>
            {selected?.visit?.id ? (
              <Can permission="visit.read">
                <Link
                  href={`/visits/${selected.visit.id}`}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
                >
                  Open visit
                </Link>
              </Can>
            ) : null}
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <EmptyState
                className="border-0"
                title="Select an invoice"
                description="Pick a row on the left to take payment."
              />
            ) : detailQuery.isPending && !selected ? (
              <TableSkeleton rows={4} columns={2} />
            ) : detailQuery.isError ? (
              <ErrorState
                className="border-0"
                error={detailQuery.error}
                onRetry={() => detailQuery.refetch()}
              />
            ) : selected ? (
              <InvoiceDetail
                invoice={selected}
                onPaid={() => {
                  invalidate();
                  void detailQuery.refetch();
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function InvoiceDetail({
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            billingApi
              .downloadInvoicePdf(invoice.id, invoice.invoiceNumber)
              .catch((error: unknown) =>
                toast.error(error instanceof ApiError ? error.message : "Could not download PDF"),
              )
          }
        >
          <FileDown className="h-3.5 w-3.5" />
          PDF
        </Button>
        {remaining > 0 ? (
          <Can permission="payment.create">
            <Button size="sm" onClick={() => setPayOpen(true)}>
              Record payment
            </Button>
          </Can>
        ) : (
          <p className="text-sm text-success">Fully paid</p>
        )}
      </div>

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
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
