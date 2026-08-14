"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, InlineSpinner } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import * as rolesApi from "@/lib/api/roles";
import { groupForPermissionKey, PERMISSION_SCOPES } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type PermissionRecord, type PermissionScope, type Role } from "@/lib/types";

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onDone,
}: {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, PermissionScope>>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const permissionsQuery = useQuery({
    queryKey: queryKeys.permissions,
    queryFn: rolesApi.listPermissions,
    enabled: open,
  });

  useEffect(() => {
    if (!open || !role) return;
    setName(role.name);
    setDescription(role.description ?? "");
    setSelected(
      Object.fromEntries(
        role.rolePermissions.map((grant) => [grant.permissionId, grant.scope]),
      ),
    );
    setNameError(null);
    setError(null);
  }, [open, role]);

  const grouped = useMemo(() => {
    const records = permissionsQuery.data ?? [];
    const map = new Map<string, PermissionRecord[]>();
    for (const record of records) {
      const label = groupForPermissionKey(record.key);
      const bucket = map.get(label) ?? [];
      bucket.push(record);
      map.set(label, bucket);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items: items.sort((a, b) => a.key.localeCompare(b.key)),
    }));
  }, [permissionsQuery.data]);

  const toggle = (record: PermissionRecord) => {
    setSelected((current) => {
      if (record.id in current) {
        const next = { ...current };
        delete next[record.id];
        return next;
      }
      return { ...current, [record.id]: record.scope };
    });
  };

  const submit = async () => {
    if (!role) return;
    setNameError(null);
    setError(null);

    if (!name.trim()) {
      setNameError("Role name is required");
      return;
    }

    const permissionIds = Object.entries(selected).map(([id, scope]) => ({ id, scope }));
    if (permissionIds.length === 0) {
      setError("Select at least one permission.");
      return;
    }

    setPending(true);
    try {
      const updated = await rolesApi.updateRole(role.id, {
        name: name.trim(),
        description: description.trim() || null,
        permissionIds,
      });
      toast.success(`Role "${updated.name}" updated`);
      onOpenChange(false);
      onDone();
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.isConflict) {
        setNameError(submitError.message);
      } else {
        setError(
          submitError instanceof ApiError ? submitError.message : "Could not update the role",
        );
      }
    } finally {
      setPending(false);
    }
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>
            Change the role name, description, and which permissions it grants.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4">
            <Field label="Name" htmlFor="edit-role-name" error={nameError ?? undefined} required>
              <Input
                id="edit-role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(nameError)}
              />
            </Field>
            <Field label="Description" htmlFor="edit-role-description">
              <Textarea
                id="edit-role-description"
                rows={1}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="tech-label">Permissions</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {selectedCount} selected
              </span>
            </div>

            {permissionsQuery.isPending ? (
              <InlineSpinner label="Loading permissions" />
            ) : permissionsQuery.isError ? (
              <ErrorState
                error={permissionsQuery.error}
                onRetry={() => permissionsQuery.refetch()}
              />
            ) : (
              <div className="max-h-[45vh] overflow-y-auto border border-border">
                {grouped.map((group) => (
                  <div key={group.label} className="border-b border-border last:border-0">
                    <div className="sticky top-0 border-b border-border bg-secondary/80 px-3 py-1.5 backdrop-blur">
                      <span className="tech-label">{group.label}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((record) => {
                        const isSelected = record.id in selected;
                        return (
                          <div
                            key={record.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40"
                          >
                            <Checkbox
                              id={`edit-perm-${record.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggle(record)}
                            />
                            <label
                              htmlFor={`edit-perm-${record.id}`}
                              className="flex-1 cursor-pointer font-mono text-xs"
                            >
                              {record.key}
                            </label>
                            {isSelected ? (
                              <Select
                                value={selected[record.id]}
                                onValueChange={(value) =>
                                  setSelected((current) => ({
                                    ...current,
                                    [record.id]: value as PermissionScope,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-7 w-40 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERMISSION_SCOPES.map((scope) => (
                                    <SelectItem key={scope} value={scope}>
                                      {scope}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="w-40 text-right font-mono text-[10px] text-muted-foreground">
                                {record.scope}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <p
              className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !role}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
