"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { RequirePermission } from "@/components/auth/require-permission";
import { PatientForm } from "@/components/patients/patient-form";
import { PageHeader } from "@/components/ui/page-header";
import * as patientsApi from "@/lib/api/patients";

export default function NewPatientPage() {
  // There is no /patients/new route for anyone without patient.create.
  return (
    <RequirePermission anyOf={["patient.create"]} redirectTo="/patients">
      <NewPatientScreen />
    </RequirePermission>
  );
}

function NewPatientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Records / Patients"
        title="New patient"
        description="The patient number is assigned by the server on save."
      />
      <PatientForm
        submitLabel="Create patient"
        onCancel={() => router.push("/patients")}
        onSubmit={async (values) => {
          const patient = await patientsApi.createPatient(values);
          await queryClient.invalidateQueries({ queryKey: ["patients"] });
          toast.success(`${patient.fullName} registered as ${patient.patientNumber}`);
          router.push(`/patients/${patient.id}`);
        }}
      />
    </div>
  );
}
