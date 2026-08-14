import { buildQuery, json, requestData, requestPage } from "@/lib/api/client";
import type {
  BillingStats,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
} from "@/lib/types";

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  patientId?: number;
  dueOnly?: boolean;
}

/** GET /billing/stats — requires `invoice.read`. */
export function getBillingStats() {
  return requestData<BillingStats>("/billing/stats");
}

/** GET /billing/invoices — requires `invoice.read`. */
export function listInvoices(params: InvoiceListParams = {}) {
  return requestPage<Invoice>(
    `/billing/invoices${buildQuery({
      ...params,
      dueOnly: params.dueOnly ? "true" : undefined,
    })}`,
  );
}

/** GET /billing/invoices/:id — requires `invoice.read`. */
export function getInvoice(id: string) {
  return requestData<Invoice>(`/billing/invoices/${id}`);
}

/** POST /billing/payments — requires `payment.create`. */
export function createPayment(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
}) {
  return requestData<Payment>("/billing/payments", {
    method: "POST",
    ...json(input),
  });
}
