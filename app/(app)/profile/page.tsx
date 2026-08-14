"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth/can";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataPoint, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FullPageSpinner } from "@/components/ui/states";
import * as usersApi from "@/lib/api/users";
import { initials } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Repeat the new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (loading) return <FullPageSpinner label="Loading profile" />;
  if (!user) return null;

  return (
    <>
      <PageHeader eyebrow="Account / Profile" title="My profile" />

      <div className="mx-auto flex w-full w-full mx-4 flex-col gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center border border-border bg-secondary font-mono text-lg text-muted-foreground">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{user.fullName}</h2>
              <p className="font-mono text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="w-full grid gap-4">
            <DataPoint label="Full name" value={user.fullName} />
            <DataPoint
              label="Username"
              value={<span className="font-mono">{user.username}</span>}
            />
            {user.phone ? <DataPoint label="Phone" value={user.phone} /> : null}
            <div>
              <span className="tech-label">Roles</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {user.roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : (
                  user.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Can permission="user.update">
          <Button variant="outline" className="self-stretch" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="h-4 w-4" />
            Change password
          </Button>
          <ChangePasswordDialog
            userId={user.id}
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
          />
        </Can>
      </div>
    </>
  );
}

function ChangePasswordDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      const message = await usersApi.resetPassword(userId, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      toast.success(message);
      onOpenChange(false);
      reset();
    } catch (error) {
      // A 400 here means the current password was wrong, so it belongs on that
      // field rather than in a toast.
      applyApiErrorToForm(error, setError, { statusFieldMap: { 400: "oldPassword" } });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Confirm your current password to set a new one.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Current password"
            htmlFor="old-password"
            error={errors.oldPassword?.message}
            required
          >
            <Input
              id="old-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.oldPassword)}
              {...register("oldPassword")}
            />
          </Field>

          <Field
            label="New password"
            htmlFor="new-password"
            error={errors.newPassword?.message}
            required
          >
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="confirm-password"
            error={errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
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
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
