"use client";

import { InvoiceListScreen } from "@/components/billing/invoice-list-screen";
import { RequirePermission } from "@/components/auth/require-permission";

export default function PastBillsPage() {
  return (
    <RequirePermission anyOf={["invoice.read"]} redirectTo="/dashboard">
      <InvoiceListScreen mode="past" />
    </RequirePermission>
  );
}
