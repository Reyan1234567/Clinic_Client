import {
  buildQuery,
  json,
  requestData,
  requestMessage,
  requestPage,
} from "@/lib/api/client";
import type {
  User,
  UserListItem,
  UserStatus,
  UserSummary,
  UserWithStatus,
} from "@/lib/types";

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * GET /users — requires `user.read`.
 * Includes status and assigned roles for the admin table.
 */
export function listUsers(params: UserListParams = {}) {
  return requestPage<UserListItem>(`/users${buildQuery({ ...params })}`);
}

/**
 * POST /users — requires `user.create`.
 * `role` is an array of role UUIDs from GET /roles, never role names.
 */
export function createUser(input: {
  fullName: string;
  username: string;
  phone: string;
  password: string;
  role: string[];
}) {
  return requestData<UserSummary>("/users", { method: "POST", ...json(input) });
}

/** PATCH /users/:id/status — requires `user.update-status`. */
export function setUserStatus(id: string, status: UserStatus) {
  return requestData<UserWithStatus>(`/users/${id}/status`, {
    method: "PATCH",
    ...json({ status }),
  });
}

/**
 * PATCH /users/:id/roles — requires `role.update` (admin).
 * Replaces the full role set; at least one role required.
 */
export function setUserRoles(id: string, roleIds: string[]) {
  return requestData<UserListItem>(`/users/${id}/roles`, {
    method: "PATCH",
    ...json({ roleIds }),
  });
}

/**
 * PATCH /users/:id/reset-password — requires `user.update`.
 * 400 when the current password is wrong; put that on the oldPassword field.
 */
export function resetPassword(
  id: string,
  input: { oldPassword: string; newPassword: string },
) {
  return requestMessage(`/users/${id}/reset-password`, {
    method: "PATCH",
    ...json(input),
  });
}

/**
 * GET /users/dentists — requires `user.readDentists`.
 * Active dentists only, sorted by name. This is the booking dentist picker.
 * The route is additionally role-gated to receptionist/admin/owner, so a
 * dentist holding the permission can still get a 403 here.
 */
export function listDentists() {
  return requestData<User[]>("/users/dentists");
}
