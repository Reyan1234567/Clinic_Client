"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPoint } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { AppointmentStatusBadge } from "@/components/ui/status-badge";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import * as appointmentsApi from "@/lib/api/appointments";
import { formatDateOnly, formatDateTime, formatPatientDemographics, formatTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export default function AppointmentDetailPage() {
  return (
    <RequirePermission anyOf={["appointment.read"]} redirectTo="/dashboard">
      <AppointmentDetailScreen />
    </RequirePermission>
  );
}

function AppointmentDetailScreen() {
  const params = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: queryKeys.appointment(params.id),
    queryFn: () => appointmentsApi.getAppointment(params.id),
  });

  if (query.isPending) return <FullPageSpinner label="Loading appointment" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const appointment = query.data;

  return (
    <>
      <PageHeader
        eyebrow="Schedule / Appointment"
        title={appointment.patient.fullName}
        description={`${formatDateOnly(appointment.appointmentTime)} at ${formatTime(appointment.appointmentTime)}`}
      >
        <AppointmentStatusBadge status={appointment.status} />
        <AppointmentActions appointment={appointment} includeOpen={false} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DataPoint label="Date" value={formatDateOnly(appointment.appointmentTime)} />
            <DataPoint label="Time" value={formatTime(appointment.appointmentTime)} />
            <DataPoint label="Purpose" value={appointment.purpose} className="sm:col-span-2" />
            <DataPoint label="Dentist" value={appointment.dentist.fullName} />
            <DataPoint
              label="Checked in"
              value={appointment.checkedInAt ? formatDateTime(appointment.checkedInAt) : "Not yet"}
            />
            <DataPoint label="Status" value={<AppointmentStatusBadge status={appointment.status} />} />
            <DataPoint
              label="Visit"
              value={
                appointment.visit ? (
                  <Link
                    href={`/visits/${appointment.visit.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {appointment.visit.status === "WAITING"
                      ? "Waiting"
                      : appointment.visit.status === "OPEN"
                        ? "In chair"
                        : appointment.visit.status === "CLOSED"
                          ? "Finished"
                          : appointment.visit.status}
                  </Link>
                ) : (
                  "Not started"
                )
              }
            />
            <DataPoint label="Updated" value={formatDateTime(appointment.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DataPoint
              label="Name"
              value={
                <Link
                  href={`/patients/${appointment.patient.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {appointment.patient.fullName}
                </Link>
              }
            />
            <DataPoint
              label="Patient number"
              value={<span className="font-mono">{appointment.patient.patientNumber}</span>}
            />
            <DataPoint
              label="Phone"
              value={<span className="font-mono">{appointment.patient.phone}</span>}
            />
            <DataPoint
              label="Sex / DOB"
              value={formatPatientDemographics(appointment.patient)}
            />
            <DataPoint label="Address" value={appointment.patient.address} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
