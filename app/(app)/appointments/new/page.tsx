"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { RequirePermission } from "@/components/auth/require-permission";
import { BookingForm } from "@/components/appointments/booking-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import * as appointmentsApi from "@/lib/api/appointments";
import * as patientsApi from "@/lib/api/patients";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";

export default function NewAppointmentPage() {
  return (
    <RequirePermission anyOf={["appointment.create"]} redirectTo="/dashboard">
      <NewAppointmentScreen />
    </RequirePermission>
  );
}

function NewAppointmentScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasScope } = usePermissions();
  const canReadAllAppointments = hasScope("appointment.readAll", "GLOBAL");

  const patientIdParam = Number(searchParams.get("patientId"));
  const dateParam = searchParams.get("date") ?? undefined;
  const hasPatientParam = Number.isFinite(patientIdParam) && patientIdParam > 0;

  const patientQuery = useQuery({
    queryKey: queryKeys.patient(patientIdParam),
    queryFn: () => patientsApi.getPatient(patientIdParam),
    enabled: hasPatientParam,
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Appointments"
        title="Book appointment"
        description="One treatment room, so each date and time can hold a single appointment."
      />
      <Card>
        <CardContent>
          {hasPatientParam && patientQuery.isPending ? null : (
            <BookingForm
              initialPatient={patientQuery.data ?? null}
              initialDate={dateParam}
              onCancel={() => router.back()}
              onSubmit={async (input) => {
                await appointmentsApi.createAppointment(input);
                // The write returns a bare appointment, so the list is
                // invalidated rather than patched.
                await queryClient.invalidateQueries({ queryKey: ["appointments"] });
                toast.success("Appointment booked");
                router.push(
                  canReadAllAppointments ? "/appointments" : "/appointments/me",
                );
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
