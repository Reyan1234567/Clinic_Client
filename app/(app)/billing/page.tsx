"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InvoiceListScreen } from "@/components/billing/invoice-list-screen";
import { RequirePermission } from "@/components/auth/require-permission";
import { FullPageSpinner } from "@/components/ui/states";

export default function PendingBillsPage() {
  return (
    <RequirePermission anyOf={["invoice.read"]} redirectTo="/dashboard">
      <PendingBillsScreen />
    </RequirePermission>
  );
}

function PendingBillsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceFromUrl = searchParams.get("invoice");

  useEffect(() => {
    if (invoiceFromUrl) router.replace(`/billing/${invoiceFromUrl}`);
  }, [invoiceFromUrl, router]);

  if (invoiceFromUrl) return <FullPageSpinner label="Opening invoice" />;

  return <InvoiceListScreen mode="pending" />;
}
