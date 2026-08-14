"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { VisitStateBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import * as visitsApi from "@/lib/api/visits";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Patient-level visit history list. Rows open the read-only history detail page.
 */
export function PatientHistoryPanel({
  patientId,
  currentVisitId,
}: {
  patientId: number;
  currentVisitId?: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.visitsForPatient(patientId, { limit: 50 }),
    queryFn: () => visitsApi.listVisitsForPatient(patientId, { limit: 50 }),
  });

  const visits = query.data?.data ?? [];

  return (
    <div className="border border-[var(--clinical-border)] bg-[var(--clinical-panel)]">
      <div className="border-b border-[var(--clinical-border)] px-3 py-2">
        <p className="text-sm font-medium text-[var(--clinical-fg)]">Patient history</p>
        <p className="text-xs text-[var(--clinical-muted)]">
          Previous visits, diagnoses, and ordered services for this patient.
        </p>
      </div>

      {query.isPending ? (
        <div className="p-3">
          <TableSkeleton columns={5} rows={4} />
        </div>
      ) : query.isError ? (
        <ErrorState
          className="border-0"
          error={query.error}
          onRetry={() => query.refetch()}
        />
      ) : visits.length === 0 ? (
        <EmptyState
          className="border-0"
          title="No visit history"
          description="Earlier visits for this patient will show up here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Title / complaint</th>
                <th>Diagnosis</th>
                <th>Dentist</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((row) => {
                const isCurrent = row.id === currentVisitId;
                const href = `/patients/${patientId}/history/${row.id}`;
                return (
                  <tr
                    key={row.id}
                    className={cn(isCurrent && "bg-[var(--clinical-row-hover)]")}
                  >
                    <td className="whitespace-nowrap">
                      <Link href={href} className="font-medium hover:underline">
                        {formatDateOnly(row.createdAt)}
                      </Link>
                      {row.finishedAt ? (
                        <p className="font-mono text-[10px] text-[var(--clinical-muted)]">
                          closed {formatDateTime(row.finishedAt)}
                        </p>
                      ) : null}
                      {isCurrent ? (
                        <p className="font-mono text-[10px] text-primary">This visit</p>
                      ) : null}
                    </td>
                    <td>
                      <VisitStateBadge
                        finishedAt={row.finishedAt ?? null}
                        status={row.status}
                      />
                    </td>
                    <td className="max-w-[14rem]">
                      <Link href={href} className="block hover:underline">
                        <p className="truncate text-sm">
                          {row.title || row.chiefComplaint || "—"}
                        </p>
                        {row.title && row.chiefComplaint ? (
                          <p className="truncate text-xs text-[var(--clinical-muted)]">
                            {row.chiefComplaint}
                          </p>
                        ) : null}
                      </Link>
                    </td>
                    <td className="max-w-[12rem] truncate text-xs text-[var(--clinical-muted)]">
                      {row.diagnosis ?? "—"}
                    </td>
                    <td className="whitespace-nowrap text-xs">{row.dentist.fullName}</td>
                    <td className="text-xs text-[var(--clinical-muted)]">
                      {row.visitProcedures.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5">
                          {row.visitProcedures.slice(0, 3).map((proc) => (
                            <li key={proc.id} className="truncate">
                              {proc.title}
                              <span className="ml-1 font-mono text-[10px] opacity-70">
                                {proc.status}
                              </span>
                            </li>
                          ))}
                          {row.visitProcedures.length > 3 ? (
                            <li className="font-mono text-[10px]">
                              +{row.visitProcedures.length - 3} more
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
