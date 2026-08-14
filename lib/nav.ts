import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";
import type { PermissionScope } from "@/lib/types";

export interface NavChild {
  label: string;
  href: string;
  /** Rendered only when at least one of these is held. */
  anyOf?: PermissionKey[];
  /** When set, each matching permission must also be granted at this scope. */
  scope?: PermissionScope;
}

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  anyOf?: PermissionKey[];
  scope?: PermissionScope;
  children?: NavChild[];
}

/**
 * Navigation is assembled from permissions, never from role names. An entry
 * with no `anyOf` is always available; every other entry disappears entirely
 * when the user cannot read that screen.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clinical",
    href: "/visits/me",
    icon: Stethoscope,
    // Chart + doctor floor only — not unlocked by desk visit.create / appointment.readAll.
    anyOf: ["visit.setFinished", "visit:all"],
    children: [
      {
        label: "My floor today",
        href: "/visits/me/queue",
        anyOf: ["visit.read"],
        scope: "PERSONAL",
      },
      {
        label: "My visits",
        href: "/visits/me",
        anyOf: ["visit.read"],
        scope: "PERSONAL",
      },
      {
        label: "All patient visits",
        href: "/visits/patients",
        anyOf: ["visit:all"],
      },
    ],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    anyOf: ["patient.read"],
    children: [
      { label: "All patients", href: "/patients", anyOf: ["patient.read"] },
      {
        label: "New patient",
        href: "/patients/new",
        anyOf: ["patient.create"],
      },
    ],
  },
  {
    label: "Appointments",
    href: "/appointments/me",
    icon: CalendarDays,
    anyOf: ["appointment.readAll", "appointment.read", "appointment.create"],
    children: [
      {
        label: "My calendar",
        href: "/appointments/me",
        anyOf: ["appointment.read"],
        scope: "PERSONAL",
      },
      {
        label: "My today",
        href: "/appointments/me/today",
        anyOf: ["appointment.read"],
        scope: "PERSONAL",
      },
      {
        label: "Clinic calendar",
        href: "/appointments",
        anyOf: ["appointment.readAll"],
      },
      {
        label: "Clinic floor today",
        href: "/visits/queue",
        anyOf: ["appointment.readAll", "visit:all"],
      },
      {
        label: "Book appointment",
        href: "/appointments/new",
        anyOf: ["appointment.create"],
      },
    ],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    anyOf: ["invoice.read"],
    children: [
      { label: "To collect", href: "/billing", anyOf: ["invoice.read"] },
    ],
  },
  {
    label: "Treatment plans",
    href: "/treatment-plans/me",
    icon: ClipboardList,
    anyOf: ["treatmentPlan.read"],
    children: [
      {
        label: "My plans",
        href: "/treatment-plans/me",
        anyOf: ["treatmentPlan.read"],
        scope: "PERSONAL",
      },
      {
        label: "All plans",
        href: "/treatment-plans",
        anyOf: ["treatmentPlan.read"],
        scope: "GLOBAL",
      },
    ],
  },
  {
    label: "Catalog",
    href: "/catalog",
    icon: BookOpen,
    anyOf: ["catalog.read"],
  },
  {
    label: "Users",
    href: "/users",
    icon: UserCog,
    anyOf: ["user.read"],
  },
  {
    label: "Roles",
    href: "/roles",
    icon: ShieldCheck,
    anyOf: ["role.read"],
  },
  {
    label: "Audit log",
    href: "/audit",
    icon: ScrollText,
    anyOf: ["audit.read"],
  },
];

function entryAllowed(
  anyOf: PermissionKey[] | undefined,
  scope: PermissionScope | undefined,
  has: (permission: PermissionKey) => boolean,
  hasScope: (permission: PermissionKey, scope: PermissionScope) => boolean,
) {
  if (!anyOf) return true;
  if (scope) return anyOf.some((permission) => hasScope(permission, scope));
  return anyOf.some(has);
}

export function visibleNavItems(
  has: (permission: PermissionKey) => boolean,
  hasScope: (permission: PermissionKey, scope: PermissionScope) => boolean,
): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    entryAllowed(item.anyOf, item.scope, has, hasScope),
  ).map((item) => {
    const children = item.children?.filter((child) =>
      entryAllowed(child.anyOf, child.scope, has, hasScope),
    );
    return {
      ...item,
      // Prefer the first reachable child so admins land on clinic calendar and
      // doctors on "My calendar" without a dead parent link.
      href: children?.[0]?.href ?? item.href,
      children,
    };
  });
}
