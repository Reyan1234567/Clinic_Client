import { json, requestData, requestMessage } from "@/lib/api/client";
import type { PermissionRecord, PermissionScope, Role } from "@/lib/types";

export type RolePermissionInput = { id: string; scope: PermissionScope };

export type RoleWriteInput = {
  name: string;
  description?: string | null;
  permissionIds: RolePermissionInput[];
};

/** GET /roles — requires `role.read`. */
export function listRoles() {
  return requestData<Role[]>("/roles");
}

/**
 * POST /roles — requires `role.create`.
 * 409 if the name is taken.
 */
export function createRole(input: RoleWriteInput) {
  return requestData<Role>("/roles", { method: "POST", ...json(input) });
}

/**
 * PATCH /roles/:id — requires `role.update`.
 * Replaces the full permission set. 409 if the name is taken.
 */
export function updateRole(id: string, input: RoleWriteInput) {
  return requestData<Role>(`/roles/${id}`, { method: "PATCH", ...json(input) });
}

/**
 * DELETE /roles/:id — requires `role.delete`.
 * 409 when users still hold the role, or when deleting ADMIN.
 */
export function deleteRole(id: string) {
  return requestMessage(`/roles/${id}`, { method: "DELETE" });
}

/**
 * GET /permissions — requires `permission.read`.
 * The role editor's checkbox list is built from this, never from hardcoded keys.
 */
export function listPermissions() {
  return requestData<PermissionRecord[]>("/permissions");
}
