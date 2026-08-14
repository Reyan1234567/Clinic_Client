"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequirePermission } from "@/components/auth/require-permission";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as visitsApi from "@/lib/api/visits";
import type { VisitListStatusFilter } from "@/lib/api/visits";
import { formatDateOnly } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";

const LIMIT = 10;
const ALL = "ALL";

export default function AllPatientVisitsPage() {
  return (
    <RequirePermission anyOf={["visit:all"]} redirectTo="/dashboard">
      <AllPatientVisitsScreen />
    </RequirePermission>
  );
}

function AllPatientVisitsScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VisitListStatusFilter | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  };

  const query = useQuery({
    queryKey: queryKeys.patientVisits(params),
    queryFn: () => visitsApi.listPatientVisits(params),
  });

  return (
    <>
      <PageHeader
        eyebrow="Clinical"
        title="All patient visits"
        description="Every recorded visit across the clinic."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search patient or complaint"
            className="max-w-xs flex-1"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as VisitListStatusFilter | typeof ALL);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All procedures</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.isPending ? (
          <TableSkeleton columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching visits" : "No visits recorded"}
            description={
              debouncedSearch
                ? "Try another patient name or complaint."
                : "Clinical visits appear here once dentists start recording them."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Chief complaint</TableHead>
                  <TableHead>Procedures</TableHead>
                  <TableHead>Rx / Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      <Link
                        href={`/visits/${visit.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {formatDateOnly(visit.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link
                        href={`/patients/${visit.patient.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {visit.patient.fullName}
                      </Link>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {visit.patient.patientNumber}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {visit.dentist.fullName}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                      {visit.chiefComplaint ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {visit.visitProcedures.length === 0 ? (
                          <span className="font-mono text-[10px] text-muted-foreground">none</span>
                        ) : (
                          visit.visitProcedures.slice(0, 2).map((procedure) => (
                            <Badge key={procedure.id} variant="outline">
                              {procedure.title}
                            </Badge>
                          ))
                        )}
                        {visit.visitProcedures.length > 2 ? (
                          <Badge variant="muted">+{visit.visitProcedures.length - 2}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {visit.prescriptions.length} / {visit._count.files}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
