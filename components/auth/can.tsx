"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionKey } from "@/lib/permissions";

interface CanProps {
  /** Renders the children only when this permission is held. */
  permission?: PermissionKey;
  /** Renders when at least one of these is held. */
  anyOf?: PermissionKey[];
  /** Renders only when all of these are held. */
  allOf?: PermissionKey[];
  children: React.ReactNode;
  /** Optional replacement. Leave unset so nothing reaches the DOM. */
  fallback?: React.ReactNode;
}

/**
 * Renders nothing at all when the permission is absent. Deliberately not a
 * disabled or greyed-out state: an action the user cannot perform must not be
 * in the DOM.
 */
export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps) {
  const { has, hasAny, hasAll, loading } = usePermissions();

  if (loading) return null;

  const checks: boolean[] = [];
  if (permission) checks.push(has(permission));
  if (anyOf?.length) checks.push(hasAny(...anyOf));
  if (allOf?.length) checks.push(hasAll(...allOf));

  const allowed = checks.length > 0 && checks.every(Boolean);

  return <>{allowed ? children : fallback}</>;
}
