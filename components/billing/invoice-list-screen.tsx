"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InvoiceTable } from "@/components/billing/invoice-table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import * as billingApi from "@/lib/api/billing";
import {
  fromKeyForBillingPeriod,
  formatMoney,
  type BillingPeriod,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { InvoiceListSummary } from "@/lib/types";

const LIMIT = 20;

const PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "all", label: "All time" },
];

export function InvoiceListScreen({ mode }: { mode: "pending" | "past" }) {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<BillingPeriod>("week");
  const isPending = mode === "pending";
  const from = isPending ? undefined : fromKeyForBillingPeriod(period);
  const params = isPending
    ? { dueOnly: true as const, page, limit: LIMIT }
    : { status: "PAID" as const, page, limit: LIMIT, from };

  const query = useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: () => billingApi.listInvoices(params),
  });

  const invoices = query.data?.data ?? [];
  const summary = query.data?.meta.summary;

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow="Front desk"
        title={isPending ? "Pending bills" : "Past bills"}
        description={
          isPending
            ? "Unpaid and partially paid invoices waiting to be collected."
            : "Fully paid invoices for the selected period."
        }
      >
        {!isPending ? (
          <PeriodSelect
            value={period}
            onChange={(next) => {
              setPeriod(next);
              setPage(1);
            }}
          />
        ) : null}
      </PageHeader>

      {!isPending && (summary || query.isPending) ? (
        <InvoiceSummaryCard summary={summary} loading={query.isPending} className="mb-4" />
      ) : null}

      {query.isPending ? (
        <Card>
          <TableSkeleton rows={8} columns={4} />
        </Card>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : invoices.length === 0 ? (
        <EmptyState
          className="min-h-[22rem]"
          title={isPending ? "Nothing to collect" : "No paid bills in this period"}
          description={
            isPending
              ? "When a doctor closes a visit with succeeded services, the invoice appears here."
              : "Try a wider date range, or wait until a bill is fully paid."
          }
        />
      ) : (
        <Card>
          <InvoiceTable invoices={invoices} />
          {query.data?.meta ? (
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          ) : null}
        </Card>
      )}
    </>
  );
}

export function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as BillingPeriod)}>
      <SelectTrigger className={className ?? "w-44"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIODS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InvoiceSummaryCard({
  summary,
  loading,
  className,
}: {
  summary?: InvoiceListSummary;
  loading?: boolean;
  className?: string;
}) {
  const stats = [
    { label: "Bills", value: summary ? String(summary.invoiceCount) : "—" },
    { label: "Collected", value: summary ? formatMoney(summary.total) : "—" },
    { label: "Average bill", value: summary ? formatMoney(summary.average) : "—" },
  ];

  return (
    <Card className={className}>
      <CardContent className="grid gap-6 py-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="tech-label">{stat.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              {loading ? "…" : stat.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
