import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import type { PermissionKey } from "@/lib/permissions";
import type { PermissionScope } from "@/lib/types";

export function usePermissions() {
  const { user, loading } = useAuth();

  return useMemo(() => {
    const granted = new Set<string>(user?.permissions ?? []);
    const grants = user?.permissionGrants ?? [];

    const has = (permission: PermissionKey) => granted.has(permission);
    const hasAny = (...list: PermissionKey[]) => list.some((p) => granted.has(p));
    const hasAll = (...list: PermissionKey[]) => list.every((p) => granted.has(p));
    const hasScope = (permission: PermissionKey, scope: PermissionScope) =>
      grants.some((grant) => grant.key === permission && grant.scope === scope);

    return {
      loading,
      permissions: user?.permissions ?? [],
      permissionGrants: grants,
      has,
      hasAny,
      hasAll,
      hasScope,
    };
  }, [user, loading]);
}

/** `usePermission("patinet.delete")` is a compile error, by design. */
export function usePermission(permission: PermissionKey) {
  return usePermissions().has(permission);
}

export function useAnyPermission(...permissions: PermissionKey[]) {
  return usePermissions().hasAny(...permissions);
}
