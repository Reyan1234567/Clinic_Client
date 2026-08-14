"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { RequirePermission } from "@/components/auth/require-permission";
import { CreateRoleDialog } from "@/components/roles/create-role-dialog";
import { EditRoleDialog } from "@/components/roles/edit-role-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import * as rolesApi from "@/lib/api/roles";
import { formatDateOnly } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { groupForPermissionKey } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Role } from "@/lib/types";

export default function RolesPage() {
  return (
    <RequirePermission anyOf={["role.read"]} redirectTo="/dashboard">
      <RolesScreen />
    </RequirePermission>
  );
}

function RolesScreen() {
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const query = useQuery({
    queryKey: queryKeys.roles,
    queryFn: rolesApi.listRoles,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.roles });

  // The role editor's checkbox list comes from GET /permissions.
  const canCreate = has("role.create") && has("permission.read");
  const canEdit = has("role.update") && has("permission.read");
  const canDelete = has("role.delete");

  const deleteMutation = useMutation({
    mutationFn: (role: Role) => rolesApi.deleteRole(role.id),
    onSuccess: (message, role) => {
      toast.success(message || `Role "${role.name}" deleted`);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not delete role");
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin / Roles"
        title="Roles"
        description="Each role carries a set of permissions. Users inherit the permissions of every role they hold."
      >
        {canCreate ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New role
          </Button>
        ) : null}
      </PageHeader>

      {query.isPending ? (
        <CardSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Create a role, pick its permissions, then assign it to users."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              canEdit={canEdit}
              canDelete={canDelete && role.name !== "ADMIN"}
              onEdit={() => setEditTarget(role)}
              onDelete={() => setDeleteTarget(role)}
            />
          ))}
        </div>
      )}

      <Can permission="role.create">
        <CreateRoleDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onDone={invalidate}
        />
      </Can>

      <Can permission="role.update">
        <EditRoleDialog
          role={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onDone={invalidate}
        />
      </Can>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete this role?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. Roles still assigned to users cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete role"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </>
  );
}

function RoleCard({
  role,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  role: Role;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const groups = new Map<string, { key: string; scope: string }[]>();
  for (const rolePermission of role.rolePermissions) {
    const key = rolePermission.permission.key;
    const label = groupForPermissionKey(key);
    const bucket = groups.get(label) ?? [];
    bucket.push({ key, scope: rolePermission.scope });
    groups.set(label, bucket);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{role.name}</CardTitle>
              <Badge variant="outline">{role.rolePermissions.length} permissions</Badge>
            </div>
            <CardDescription className="mt-1">
              {role.description ?? "No description."} · created {formatDateOnly(role.createdAt)}
            </CardDescription>
          </div>
          {canEdit || canDelete ? (
            <div className="flex shrink-0 items-center gap-1">
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${role.name}`}
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${role.name}`}
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {groups.size === 0 ? (
          <p className="text-xs text-muted-foreground">
            This role has no permissions, so it grants nothing.
          </p>
        ) : (
          Array.from(groups.entries()).map(([label, items]) => (
            <div key={label}>
              <span className="tech-label">{label}</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={`${item.key}-${item.scope}`}
                    className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    title={`scope: ${item.scope}`}
                  >
                    {item.key}
                    {item.scope !== "GLOBAL" ? (
                      <span className="ml-1 text-primary">{item.scope}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
