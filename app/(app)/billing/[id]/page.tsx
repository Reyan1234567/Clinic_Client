"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InvoiceDetail } from "@/components/billing/invoice-detail";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import * as billingApi from "@/lib/api/billing";
import { queryKeys } from "@/lib/query-keys";

export default function InvoiceDetailPage() {
  return (
    <RequirePermission anyOf={["invoice.read"]} redirectTo="/dashboard">
      <InvoiceDetailScreen />
    </RequirePermission>
  );
}

function InvoiceDetailScreen() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.invoice(invoiceId),
    queryFn: () => billingApi.getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
  });

  if (query.isPending) return <FullPageSpinner label="Loading invoice" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const invoice = query.data;
  const listHref = invoice.status === "PAID" ? "/billing/past" : "/billing";

  return (
    <>
      <PageHeader
        size="sm"
        eyebrow="Front desk"
        title={invoice.invoiceNumber}
        description={invoice.patient.fullName}
      >
        <Link
          href={listHref}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
        >
          {invoice.status === "PAID" ? "Past bills" : "Pending bills"}
        </Link>
        {invoice.visit?.id ? (
          <Can permission="visit.read">
            <Link
              href={`/visits/${invoice.visit.id}`}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
            >
              Open visit
            </Link>
          </Can>
        ) : null}
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <InvoiceDetail
            invoice={invoice}
            onPaid={() => {
              void queryClient.invalidateQueries({ queryKey: ["billing"] });
              void query.refetch();
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
