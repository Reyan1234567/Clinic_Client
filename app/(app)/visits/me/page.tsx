"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { CreateVisitDialog } from "@/components/visits/create-visit-dialog";
import { Button } from "@/components/ui/button";
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

export default function MyVisitsPage() {
  return (
    <RequirePermission anyOf={["visit.read"]} redirectTo="/dashboard">
      <MyVisitsScreen />
    </RequirePermission>
  );
}

function MyVisitsScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VisitListStatusFilter | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  };

  const query = useQuery({
    queryKey: queryKeys.myVisits(params),
    queryFn: () => visitsApi.listMyVisits(params),
  });

  return (
    <>
      <PageHeader
        eyebrow="Clinical"
        title="My visits"
        description="Visits where you are the treating dentist."
      >
        <Can permission="visit.create">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create visit
          </Button>
        </Can>
      </PageHeader>

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
          <TableSkeleton columns={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching visits" : "No visits yet"}
            description={
              debouncedSearch
                ? "Try another patient name or complaint."
                : "Create a visit to start recording care for a patient."
            }
            action={
              <Can permission="visit.create">
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Create visit
                </Button>
              </Can>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief complaint</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Procedures</TableHead>
                  <TableHead>Files</TableHead>
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
                      {visit.patient.fullName}
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {visit.patient.phone}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                      {visit.chiefComplaint ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">
                      {visit.diagnosis ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {visit.visitProcedures.length}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {visit._count.files}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination meta={query.data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CreateVisitDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
