"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as auditApi from "@/lib/api/audit";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

export default function AuditPage() {
  return (
    <RequirePermission anyOf={["audit.read"]} redirectTo="/dashboard">
      <AuditScreen />
    </RequirePermission>
  );
}

function AuditScreen() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedAction = useDebouncedValue(action);
  const debouncedEntity = useDebouncedValue(entity);

  const params = {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    action: debouncedAction || undefined,
    entity: debouncedEntity || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const query = useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => auditApi.listAuditLogs(params),
  });

  const resetPage = () => setPage(1);

  return (
    <>
      <PageHeader
        eyebrow="Admin / Audit"
        title="Audit log"
        description="Immutable trail of clinic-changing actions. Admin access only."
      />

      <Card>
        <div className="grid gap-3 border-b border-border p-3 sm:grid-cols-2 lg:grid-cols-5">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              resetPage();
            }}
            placeholder="Search actor, action, entity…"
            className="sm:col-span-2 lg:col-span-1"
          />
          <Input
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              resetPage();
            }}
            placeholder="Action (e.g. patient.create)"
            aria-label="Filter by action"
          />
          <Input
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value);
              resetPage();
            }}
            placeholder="Entity (e.g. Patient)"
            aria-label="Filter by entity"
          />
          <Input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              resetPage();
            }}
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              resetPage();
            }}
            aria-label="To date"
          />
        </div>

        {query.isPending ? (
          <TableSkeleton columns={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} className="border-0" />
        ) : query.data.data.length === 0 ? (
          <EmptyState
            className="border-0"
            title="No audit rows"
            description="Nothing matches these filters, or no audited actions have been recorded yet."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.user.fullName}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          @{row.user.username}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{row.action}</span>
                    </TableCell>
                    <TableCell className="text-sm">{row.entity}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.entityId}
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
