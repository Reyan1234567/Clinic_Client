"use client";

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
import { Input } from "@/components/ui/input";
import { ErrorState, InlineSpinner } from "@/components/ui/states";
import * as rolesApi from "@/lib/api/roles";
import * as usersApi from "@/lib/api/users";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  username: z.string().trim().min(1, "Username is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  password: z.string().min(8, "Use at least 8 characters"),
  role: z.array(z.string()).min(1, "Pick at least one role"),
});

type FormValues = z.infer<typeof schema>;

/**
 * `role` is an array of role UUIDs from GET /roles, so this dialog depends on
 * `role.read`. Without it the roles cannot be resolved and the user cannot be
 * created at all — the caller hides the entry point in that case.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: rolesApi.listRoles,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", username: "", phone: "", password: "", role: [] },
  });

  const selectedRoles = useWatch({ control, name: "role" });

  const toggleRole = (roleId: string) => {
    const next = selectedRoles.includes(roleId)
      ? selectedRoles.filter((id) => id !== roleId)
      : [...selectedRoles, roleId];
    setValue("role", next, { shouldValidate: true });
  };

  const submit = handleSubmit(async (values) => {
    try {
      const created = await usersApi.createUser(values);
      toast.success(`${created.fullName} added`);
      reset();
      onOpenChange(false);
      onDone();
    } catch (error) {
      // 409 is a taken username; it belongs on that field.
      applyApiErrorToForm(error, setError, { statusFieldMap: { 409: "username" } });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Full name" htmlFor="user-name" error={errors.fullName?.message} required>
            <Input
              id="user-name"
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Username"
              htmlFor="user-username"
              error={errors.username?.message}
              required
            >
              <Input
                id="user-username"
                autoComplete="off"
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
            </Field>

            <Field label="Phone" htmlFor="user-phone" error={errors.phone?.message} required>
              <Input
                id="user-phone"
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </Field>
          </div>

          <Field
            label="Temporary password"
            htmlFor="user-password"
            error={errors.password?.message}
            hint="The user can change it from their profile."
            required
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </Field>

          <Field label="Roles" error={errors.role?.message} required>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
