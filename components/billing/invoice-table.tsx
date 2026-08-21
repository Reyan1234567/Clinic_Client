"use client";

import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatEnum, formatMoney } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
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
          <ClickableTableRow key={invoice.id} href={`/billing/${invoice.id}`}>
            <TableCell className="font-mono text-xs">
              {invoice.invoiceNumber}
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
          </ClickableTableRow>
        ))}
      </TableBody>
    </Table>
  );
}
