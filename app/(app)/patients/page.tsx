"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as patientsApi from "@/lib/api/patients";
import { ageFromDateOfBirth } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Patient } from "@/lib/types";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  return (
    <RequirePermission anyOf={["patient.read"]}>
      <PatientsScreen />
    </RequirePermission>
  );
}

function PatientsScreen() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const params = { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined };

  const query = useQuery({
    queryKey: queryKeys.patients(params),
    queryFn: () => patientsApi.listPatients(params),
  });

  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);
  const { has } = usePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["patients"] });

  const archiveMutation = useMutation({
    mutationFn: (patient: Patient) => patientsApi.archivePatient(patient.id),
    onSuccess: (_data, patient) => {
      toast.success(`${patient.fullName} archived`);
      setArchiveTarget(null);
      setDeleteTarget(null);
      setDeleteBlockedReason(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not archive patient");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (patient: Patient) => patientsApi.deletePatient(patient.id),
    onSuccess: (message) => {
      toast.success(message);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: unknown) => {
      // 409 means the patient has appointments or invoices. The server message
      // explains that archiving is the right move, so surface it and offer the
      // archive action to anyone who also holds patient.archive.
      if (error instanceof ApiError && error.isConflict) {
        setDeleteBlockedReason(error.message);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Could not delete patient");
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Patients"
        description="Active patient register. Archived records are excluded from every read."
      >
        <Can permission="patient.create">
          <Button asChild size="sm">
            <Link href="/patients/new">
              <Plus className="h-3.5 w-3.5" />
              New patient
            </Link>
          </Button>
        </Can>
      </PageHeader>

      <Card>
        <div className="border-b border-border p-3">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search name, phone or patient number"
            className="max-w-sm"
          />
        </div>

        {query.isPending ? (
          <TableSkeleton columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching patients" : "No patients yet"}
            description={
              debouncedSearch
                ? "Try a different name, phone number or patient number."
                : "Register a patient to start booking appointments and recording visits."
            }
            action={
              <Can permission="patient.create">
                <Button asChild size="sm">
                  <Link href="/patients/new">New patient</Link>
                </Button>
              </Can>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Full name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Sex / Age</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((patient) => {
                  const actions: RowAction[] = [
                    {
                      key: "view",
                      label: "Open record",
                      icon: Eye,
                      permission: "patient.read",
                      onSelect: () => router.push(`/patients/${patient.id}`),
                    },
                    {
                      key: "edit",
                      label: "Edit details",
                      icon: Pencil,
                      permission: "patient.update",
                      onSelect: () => router.push(`/patients/${patient.id}/edit`),
                    },
                    {
                      key: "archive",
                      label: "Archive",
                      icon: Archive,
                      permission: "patient.archive",
                      separatorBefore: true,
                      onSelect: () => setArchiveTarget(patient),
                    },
                    {
                      key: "delete",
                      label: "Delete permanently",
                      icon: Trash2,
                      permission: "patient.delete",
                      destructive: true,
                      onSelect: () => {
                        setDeleteBlockedReason(null);
                        setDeleteTarget(patient);
                      },
                    },
                  ];

                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {patient.patientNumber}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {patient.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{patient.phone}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {patient.gender === "MALE" ? "M" : "F"} ·{" "}
                        {ageFromDateOfBirth(patient.dateOfBirth) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <RowActionMenu actions={actions} label={`Actions for ${patient.fullName}`} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive this patient?"
        description={
          archiveTarget
            ? `${archiveTarget.fullName} will be hidden from every list and lookup. Their history is kept.`
            : undefined
        }
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBlockedReason(null);
          }
        }}
        title={deleteBlockedReason ? "Cannot delete this patient" : "Delete permanently?"}
        description={
          deleteBlockedReason ??
          (deleteTarget
            ? `${deleteTarget.fullName} and their record will be removed for good. This cannot be undone.`
            : undefined)
        }
        confirmLabel={deleteBlockedReason ? "Delete anyway" : "Delete permanently"}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      >
        {deleteBlockedReason && deleteTarget && has("patient.archive") ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate(deleteTarget)}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive instead
          </Button>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
