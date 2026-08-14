"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleSlash, Plus, Shield, UserCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { ManageUserRolesDialog } from "@/components/users/manage-user-roles-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import * as usersApi from "@/lib/api/users";
import { initials } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type UserListItem, type UserStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function UsersPage() {
  return (
    <RequirePermission anyOf={["user.read"]} redirectTo="/dashboard">
      <UsersScreen />
    </RequirePermission>
  );
}

function UsersScreen() {
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesUser, setRolesUser] = useState<UserListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    user: UserListItem;
    status: UserStatus;
  } | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const params = { page, limit: PAGE_SIZE, search: debouncedSearch || undefined };

  const query = useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => usersApi.listUsers(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.setUserStatus(id, status),
    onSuccess: (user) => {
      toast.success(
        user.status === "ACTIVE" ? `${user.fullName} activated` : `${user.fullName} deactivated`,
      );
      setStatusTarget(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not update the account");
      setStatusTarget(null);
    },
  });

  const users = query.data?.data ?? [];
  const canCreate = has("user.create") && has("role.read");
  const canManageRoles = has("role.update") && has("role.read");

  return (
    <>
      <PageHeader
        eyebrow="Admin / Users"
        title="Users"
        description="Accounts that can sign in. Their permissions come from the roles assigned to them."
      >
        {canCreate ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New user
          </Button>
        ) : null}
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search users"
        />
      </div>

      <Card>
        {query.isPending ? (
          <TableSkeleton columns={5} />
        ) : query.isError ? (
          <ErrorState className="border-0" error={query.error} onRetry={() => query.refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            className="border-0"
            title={debouncedSearch ? "No matching users" : "No users yet"}
            description={
              debouncedSearch ? "Try a different search term." : "Add the clinic's staff accounts."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const actions: RowAction[] = [
                    {
                      key: "roles",
                      label: "Manage roles",
                      icon: Shield,
                      permission: "role.update",
                      available: canManageRoles,
                      onSelect: () => setRolesUser(user),
                    },
                    {
                      key: "activate",
                      label: "Set active",
                      icon: UserCheck,
                      permission: "user.update-status",
                      available: user.status !== "ACTIVE",
                      onSelect: () => setStatusTarget({ user, status: "ACTIVE" }),
                    },
                    {
                      key: "deactivate",
                      label: "Deactivate",
                      icon: CircleSlash,
                      permission: "user.update-status",
                      available: user.status !== "INACTIVE",
                      destructive: true,
                      onSelect: () => setStatusTarget({ user, status: "INACTIVE" }),
                    },
                  ];

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center border border-border bg-secondary font-mono text-[10px] text-muted-foreground">
                            {initials(user.fullName)}
                          </span>
                          <span className="font-medium">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            user.roles.map((role) => (
                              <span
                                key={role.id}
                                className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                              >
                                {role.name}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-[0.08em]",
                            user.status === "ACTIVE"
                              ? "text-emerald-700"
                              : "text-muted-foreground",
                          )}
                        >
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <RowActionMenu actions={actions} label={`Actions for ${user.fullName}`} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : null}
          </>
        )}
      </Card>

      <Can permission="user.create">
        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />
      </Can>

      <ManageUserRolesDialog
        open={Boolean(rolesUser)}
        onOpenChange={(open) => !open && setRolesUser(null)}
        user={rolesUser}
        onDone={invalidate}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget?.status === "INACTIVE" ? "Deactivate this account?" : "Activate this account?"
        }
        description={
          statusTarget
            ? statusTarget.status === "INACTIVE"
              ? `${statusTarget.user.fullName} will no longer be able to sign in.`
              : `${statusTarget.user.fullName} will be able to sign in again.`
            : undefined
        }
        confirmLabel={statusTarget?.status === "INACTIVE" ? "Deactivate" : "Activate"}
        destructive={statusTarget?.status === "INACTIVE"}
        pending={statusMutation.isPending}
        onConfirm={() =>
          statusTarget &&
          statusMutation.mutate({ id: statusTarget.user.id, status: statusTarget.status })
        }
      />
    </>
  );
}
