/**
 * The authoritative permission key list, mirrored from the server's
 * `src/constants/permissions.ts`. Anything the UI gates on must appear here so
 * that `usePermission("patinet.delete")` fails to compile.
 *
 * Note the two irregular keys the server actually uses: `visit:all` (colon)
 * and `user.update-status` (hyphen).
 */
export const PERMISSIONS = [
  "catalog.create",
  "catalog.read",
  "catalog.update",
  "catalog.delete",

  "file.upload",
  "file.delete",

  "patient.create",
  "patient.read",
  "patient.update",
  "patient.archive",
  "patient.delete",

  "appointment.create",
  "appointment.read",
  "appointment.readAll",
  "appointment.update",
  "appointment.cancel",
  "appointment.reschedule",
  "appointment.checkIn",

  "permission.read",

  "role.create",
  "role.read",
  "role.update",
  "role.delete",

  "treatmentPlan.create",
  "treatmentPlan.read",
  "treatmentPlan.update",
  "treatmentPlan.delete",

  "user.create",
  "user.read",
  "user.readDentists",
  "user.update",
  "user.update-status",

  "procedure.attachImage",
  "procedure.attach",
  "procedure.create",
  "procedure.delete",
  "procedure.rollbackFinished",

  "visit-procedure.setFinished",

  "visit.create",
  "visit.read",
  "visit.update",
  "visit.delete",
  "visit.attachImage",
  "visit:all",
  "visit.setFinished",
  "visit.rollbackFinished",

  "prescription.create",
  "prescription.update",
  "prescription.delete",

  "audit.read",

  "invoice.read",
  "invoice.create",
  "payment.create",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

/** Human labels for the role editor, which builds its list from GET /permissions. */
export const PERMISSION_GROUPS: { label: string; prefixes: string[] }[] = [
  { label: "Patients", prefixes: ["patient."] },
  { label: "Appointments", prefixes: ["appointment."] },
  { label: "Visits", prefixes: ["visit.", "visit:"] },
  { label: "Procedures", prefixes: ["procedure.", "visit-procedure."] },
  { label: "Prescriptions", prefixes: ["prescription."] },
  { label: "Treatment plans", prefixes: ["treatmentPlan."] },
  { label: "Catalog", prefixes: ["catalog."] },
  { label: "Files", prefixes: ["file."] },
  { label: "Users", prefixes: ["user."] },
  { label: "Roles & permissions", prefixes: ["role.", "permission."] },
  { label: "Audit", prefixes: ["audit."] },
  { label: "Billing", prefixes: ["invoice.", "payment."] },
];

export function groupForPermissionKey(key: string) {
  return (
    PERMISSION_GROUPS.find((group) =>
      group.prefixes.some((prefix) => key.startsWith(prefix)),
    )?.label ?? "Other"
  );
}

export const PERMISSION_SCOPES = ["GLOBAL", "PERSONAL"] as const;
