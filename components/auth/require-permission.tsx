"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import type { PermissionScope } from "@/lib/types";
import { FullPageSpinner } from "@/components/ui/states";

/**
 * Route-level guard. When the read permission for a whole screen is missing the
 * route redirects away rather than rendering an empty page, matching the nav,
 * which will not have shown the entry either.
 */
export function RequirePermission({
  anyOf,
  scope,
  redirectTo = "/dashboard",
  children,
}: {
  anyOf: PermissionKey[];
  /** When set, at least one of `anyOf` must be held at this scope. */
  scope?: PermissionScope;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const { hasAny, hasScope, loading } = usePermissions();
  const router = useRouter();
  const allowed = scope
    ? anyOf.some((permission) => hasScope(permission, scope))
    : hasAny(...anyOf);

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace(redirectTo);
    }
  }, [loading, allowed, router, redirectTo]);

  if (loading) return <FullPageSpinner />;
  if (!allowed) return null;

  return <>{children}</>;
}
