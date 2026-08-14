"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ErrorState, InlineSpinner } from "@/components/ui/states";
import * as rolesApi from "@/lib/api/roles";
import * as usersApi from "@/lib/api/users";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { queryKeys } from "@/lib/query-keys";
import type { UserListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  roleIds: z.array(z.string()).min(1, "Pick at least one role"),
});

type FormValues = z.infer<typeof schema>;

/**
 * Admin-only (`role.update` + `role.read`). Replaces the full role set on a user.
 */
export function ManageUserRolesDialog({
  open,
  onOpenChange,
  user,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  onDone: () => void;
}) {
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: rolesApi.listRoles,
    enabled: open,
  });

  const {
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { roleIds: [] },
  });

  useEffect(() => {
    if (!open || !user) return;
    reset({ roleIds: user.roles.map((role) => role.id) });
  }, [open, user, reset]);

  const selectedRoles = useWatch({ control, name: "roleIds" }) ?? [];

  const toggleRole = (roleId: string) => {
    const next = selectedRoles.includes(roleId)
      ? selectedRoles.filter((id) => id !== roleId)
      : [...selectedRoles, roleId];
    setValue("roleIds", next, { shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    if (!user) return;
    try {
      await usersApi.setUserRoles(user.id, values.roleIds);
      toast.success(`Roles updated for ${user.fullName}`);
      onOpenChange(false);
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>
            {user
              ? `Choose which roles ${user.fullName} holds. Permissions are the union of every selected role.`
              : "Choose roles for this user."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Roles" error={errors.roleIds?.message} required>
            {rolesQuery.isPending ? (
              <InlineSpinner label="Loading roles" />
            ) : rolesQuery.isError ? (
              <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
            ) : rolesQuery.data.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No roles exist yet. Create one first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rolesQuery.data.map((role) => {
                  const selected = selectedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      aria-pressed={selected}
                      className={cn(
                        "border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary",
                      )}
                    >
                      {role.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !user}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save roles
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
