"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { PageHeader } from "@/components/ui/page-header";
import { AppointmentStatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as appointmentsApi from "@/lib/api/appointments";
import { formatDateOnlyShort, formatTime, todayKey } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export function TodayAppointmentsScreen({
  mode,
}: {
  mode: "clinic" | "mine";
}) {
  const isMine = mode === "mine";

  const query = useQuery({
    queryKey: isMine ? queryKeys.myAppointmentsToday : queryKeys.appointmentsToday,
    queryFn: isMine
      ? appointmentsApi.listMyTodayAppointments
      : appointmentsApi.listTodayAppointments,
  });

  return (
    <>
      <PageHeader
        eyebrow={`Schedule / ${formatDateOnlyShort(todayKey())}`}
        title={isMine ? "My queue today" : "Today's queue"}
        description={
          isMine
            ? "Patients assigned to you. After check-in they appear on My floor today."
            : "Check patients in as they arrive — that puts them on the waiting list."
        }
      >
        <Can permission="appointment.create">
          <Button asChild size="sm">
            <Link href={`/appointments/new?date=${todayKey()}`}>
              <Plus className="h-3.5 w-3.5" />
              Book
            </Link>
          </Button>
        </Can>
      </PageHeader>

      <Card>
        {query.isPending ? (
          <TableSkeleton columns={isMine ? 4 : 5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title="No appointments today"
            description={
              isMine
                ? "Nothing is assigned to you for today."
                : "Nothing is booked for today yet."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                {!isMine ? <TableHead>Dentist</TableHead> : null}
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((appointment) => (
                <ClickableTableRow
                  key={appointment.id}
                  href={`/patients/${appointment.patient.id}`}
                >
                  <TableCell className="whitespace-nowrap font-mono text-xs text-primary">
                    {formatTime(appointment.appointmentTime)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{appointment.patient.fullName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {appointment.patient.patientNumber}
                    </p>
                  </TableCell>
                  {!isMine ? (
                    <TableCell className="whitespace-nowrap text-xs">
                      {appointment.dentist.fullName}
                    </TableCell>
                  ) : null}
                  <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                    {appointment.purpose}
                  </TableCell>
                  <TableCell>
                    <AppointmentStatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <AppointmentActions appointment={appointment} />
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
