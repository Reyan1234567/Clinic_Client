"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { FileText, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { useAuth } from "@/components/providers/auth-provider";
import { CertificateFormDialog } from "@/components/visits/certificate-form-dialog";
import {
  CertificatePaper,
  certificatePrintTitle,
} from "@/components/visits/certificate-paper";
import { SignatureEditor } from "@/components/visits/signature-editor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states";
import * as certificatesApi from "@/lib/api/certificates";
import { CERTIFICATE_LABELS } from "@/lib/certificates";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import {
  ApiError,
  type CertificateData,
  type CertificateType,
  type MedicalCertificate,
  type VisitDetail,
} from "@/lib/types";

const TYPES: CertificateType[] = [
  "BIOPSY_REQUEST",
  "MEDICAL_CERTIFICATE",
  "REFERRAL_FORM",
];

export function VisitCertificates({
  visit,
  visitFinished,
}: {
  visit: VisitDetail;
  visitFinished: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasSignature = Boolean(user?.signatureFile.id);
  const printRef = useRef<HTMLDivElement>(null);

  const [createType, setCreateType] = useState<CertificateType | null>(null);
  const [editing, setEditing] = useState<MedicalCertificate | null>(null);
  const [preview, setPreview] = useState<MedicalCertificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicalCertificate | null>(
    null,
  );

  const query = useQuery({
    queryKey: queryKeys.visitCertificates(visit.id),
    queryFn: () => certificatesApi.listVisitCertificates(visit.id),
  });

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: preview
      ? certificatePrintTitle(preview, visit.patient.fullName)
      : "certificate",
    pageStyle: `@page { size: A4; margin: 12mm; }`,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.visitCertificates(visit.id),
    });
  };

  const createMutation = useMutation({
    mutationFn: (input: { type: CertificateType; data: CertificateData }) =>
      certificatesApi.createVisitCertificate(visit.id, input),
    onSuccess: () => {
      toast.success("Certificate saved");
      setCreateType(null);
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not save certificate",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CertificateData }) =>
      certificatesApi.updateCertificate(id, data),
    onSuccess: () => {
      toast.success("Certificate updated");
      setEditing(null);
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update certificate",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => certificatesApi.deleteCertificate(id),
    onSuccess: () => {
      toast.success("Certificate deleted");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete certificate",
      ),
  });

  const rows = query.data ?? [];

  return (
    <div className="space-y-3">
      {!hasSignature ? <SignatureEditor /> : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Certificates</CardTitle>
          {!visitFinished ? (
            <Can permission="visit.update">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    disabled={!hasSignature}
                    title={
                      hasSignature
                        ? CERTIFICATE_LABELS[type]
                        : "Save a signature before issuing a certificate"
                    }
                    onClick={() => setCreateType(type)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {CERTIFICATE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </Can>
          ) : null}
        </CardHeader>

        {query.isPending ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading certificates
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="border-0"
            title="No certificates yet"
            description={
              hasSignature
                ? "Issue a biopsy request, medical certificate, or referral from this visit."
                : "Add your signature first, then you can issue certificates."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {CERTIFICATE_LABELS[row.type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.doctor.fullName} · {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(row)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View
                  </Button>
                  {!visitFinished ? (
                    <Can permission="visit.update">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Can>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {hasSignature ? (
        <details className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)] p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Update signature
          </summary>
          <div className="mt-3">
            <SignatureEditor />
          </div>
        </details>
      ) : null}

      <CertificateFormDialog
        open={Boolean(createType)}
        onOpenChange={() => setCreateType(null)}
        visit={visit}
        type={createType}
        pending={createMutation.isPending}
        onSubmit={(data) => createMutation.mutate({ type: createType, data })}
      />

      {editing ? (
        <CertificateFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          visit={visit}
          type={editing.type}
          initial={editing.data}
          pending={updateMutation.isPending}
          onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
        />
      ) : null}

      <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {preview ? CERTIFICATE_LABELS[preview.type] : "Certificate"}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="overflow-auto border border-border bg-muted/40 p-3">
              <div className="mx-auto w-[210mm] origin-top bg-white shadow-sm">
                <CertificatePaper
                  ref={printRef}
                  visit={visit}
                  certificate={preview}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button onClick={() => print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this certificate?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
