"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  showInvoiceReadyToast,
  type InvoiceReadyPayload,
} from "@/components/billing/invoice-ready-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useSocketEvent } from "@/lib/hooks/use-socket-event";
import { connectSocket, getSocket } from "@/lib/socket";

export type PaymentRecordedPayload = {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  amount: string;
  paymentMethod: string;
  patientId: number;
  patientName: string;
  receivedById: string;
  receivedByName: string;
  paymentDate: string;
};

/**
 * Front-desk listener for visit-closed invoices and recorded payments.
 * Mounted once under AppProviders.
 */
export function BillingRealtime() {
  const { user } = useAuth();
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const canReadInvoices = has("invoice.read");

  useEffect(() => {
    if (!user || !canReadInvoices) return;
    connectSocket();
    const s = getSocket();
    const onConnect = () => {};
    s.on("connect", onConnect);
    return () => {
      s.off("connect", onConnect);
    };
  }, [user, canReadInvoices]);

  useSocketEvent<InvoiceReadyPayload>("invoice.ready_for_payment", (payload) => {
    if (!canReadInvoices) return;
    showInvoiceReadyToast(payload);
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  });

  useSocketEvent<PaymentRecordedPayload>("payment.recorded", () => {
    if (!canReadInvoices) return;
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  });

  return null;
}
