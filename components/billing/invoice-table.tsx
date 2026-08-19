"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
        {invoices.map((invoice) => {
          const href = `/billing/${invoice.id}`;
          const open = () => router.push(href);
          return (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              role="link"
              tabIndex={0}
              onClick={open}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  open();
                }
              }}
            >
              <TableCell className="font-mono text-xs">
                <Link
                  href={href}
                  className="text-primary hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {invoice.invoiceNumber}
                </Link>
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
          );
        })}
      </TableBody>
    </Table>
  );
}
