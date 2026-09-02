"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { CreateVisitDialog } from "@/components/visits/create-visit-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
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
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import type { PaymentRecordedPayload } from "@/components/providers/billing-realtime";
import * as visitsApi from "@/lib/api/visits";
import type { VisitListStatusFilter } from "@/lib/api/visits";
import { formatDateOnly } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSocketEvent } from "@/lib/hooks/use-socket-event";
import { queryKeys } from "@/lib/query-keys";

const LIMIT = 10;
const ALL = "ALL";

/** Matches GET /visits/me `days`: 0 = today from midnight; 6 = past 7 days. */
type VisitPeriod = "today" | "week";

const PERIODS: { value: VisitPeriod; label: string; days: number }[] = [
  { value: "today", label: "Today", days: 0 },
  { value: "week", label: "Past week", days: 6 },
];

export default function MyVisitsPage() {
  return (
    <RequirePermission anyOf={["visit.read"]} redirectTo="/dashboard">
      <MyVisitsScreen />
    </RequirePermission>
  );
}

function MyVisitsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VisitListStatusFilter | typeof ALL>(ALL);
  const [period, setPeriod] = useState<VisitPeriod>("today");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const days = PERIODS.find((option) => option.value === period)?.days ?? 0;

  const params = {
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    days,
  };

  const query = useQuery({
    queryKey: queryKeys.myVisits(params),
    queryFn: () => visitsApi.listMyVisits(params),
  });

  useSocketEvent<PaymentRecordedPayload>("payment.recorded", (payload) => {
    if (payload.dentistId && user?.id && payload.dentistId !== user.id) return;
    void queryClient.invalidateQueries({ queryKey: ["visits", "me"] });
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
            value={period}
            onValueChange={(value) => {
              setPeriod(value as VisitPeriod);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            title={debouncedSearch ? "No matching visits" : "No visits in this period"}
            description={
              debouncedSearch
                ? "Try another patient name or complaint."
                : period === "today"
                  ? "No visits assigned to you today. Switch to Past week, or create a visit."
                  : "No visits in the past week. Create a visit to start recording care."
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
                  <TableHead>Payment</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((visit) => (
                  <ClickableTableRow key={visit.id} href={`/visits/${visit.id}`}>
                    <TableCell className="whitespace-nowrap text-xs font-medium">
                      {formatDateOnly(visit.createdAt)}
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
                    <TableCell>
                      {visit.invoice ? (
                        <InvoiceStatusBadge status={visit.invoice.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {visit._count.files}
                    </TableCell>
                  </ClickableTableRow>
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
