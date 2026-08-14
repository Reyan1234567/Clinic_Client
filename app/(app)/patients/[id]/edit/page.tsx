"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { RequirePermission } from "@/components/auth/require-permission";
import { PatientForm } from "@/components/patients/patient-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import * as patientsApi from "@/lib/api/patients";
import { queryKeys } from "@/lib/query-keys";

export default function EditPatientPage() {
  return (
    <RequirePermission anyOf={["patient.update"]} redirectTo="/patients">
      <EditPatientScreen />
    </RequirePermission>
  );
}

function EditPatientScreen() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.patient(patientId),
    queryFn: () => patientsApi.getPatient(patientId),
    enabled: Number.isFinite(patientId),
  });

  if (query.isPending) return <FullPageSpinner label="Loading patient" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={`Records / ${query.data.patientNumber}`}
        title={`Edit ${query.data.fullName}`}
      />
      <PatientForm
        patient={query.data}
        submitLabel="Save changes"
        onCancel={() => router.push(`/patients/${patientId}`)}
        onSubmit={async (values) => {
          await patientsApi.updatePatient(patientId, values);
          await queryClient.invalidateQueries({ queryKey: ["patients"] });
          await queryClient.invalidateQueries({ queryKey: queryKeys.patient(patientId) });
          toast.success("Patient updated");
          router.push(`/patients/${patientId}`);
        }}
      />
    </div>
  );
}
