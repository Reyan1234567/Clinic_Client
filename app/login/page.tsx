"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { HeranMark } from "@/components/brand/heran-mark";
import { LumenCredit } from "@/components/brand/lumen-credit";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { ApiError } from "@/lib/types";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.username, values.password);
    } catch (error) {
      // 401 is bad credentials, 403 is a deactivated account. Both belong on
      // the form, not in a toast, and neither is a field-level error.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setFormError(error.message);
        return;
      }
      applyApiErrorToForm(error, setError, { silent: true });
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError("Could not reach the server");
    }
  });

  return (
    <div className="bg-tech-dots flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <HeranMark size={64} priority className="mb-4" />
          <p className="text-lg font-semibold tracking-tight">Heran Specialty Dental</p>
          <span className="tech-label mt-1">Clinic management system</span>
        </div>

        <div className="tech-card p-6">
          <h1 className="text-sm font-semibold">Sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your clinic credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
            <Field label="Username" htmlFor="username" error={errors.username?.message} required>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            {formError ? (
              <p
                className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="mt-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>

        <LumenCredit className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.14em]" />
      </div>
    </div>
  );
}
