import { json, requestData, requestMessage, requestRaw } from "@/lib/api/client";
import type { AuthUser } from "@/lib/types";

/** POST /auth/login — no permission required. Sets both auth cookies. */
export function login(input: { username: string; password: string }) {
  return requestData<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    ...json(input),
  });
}

/** POST /auth/refresh — no permission required. Rotates both cookies. */
export function refreshSession() {
  return requestData<{ user: AuthUser }>("/auth/refresh", { method: "POST" });
}

/** POST /auth/logout — no permission required. */
export function logout() {
  return requestMessage("/auth/logout", { method: "POST" });
}

/** GET /me — no permission required. Rehydrates the session on page load. */
export function getMe() {
  return requestData<AuthUser>("/me");
}

/** GET /health — raw payload, no envelope. */
export function getHealth() {
  return requestRaw<{ status: string; uptime: number; timestamp: string }>("/health");
}

/** PATCH /me/signature — requires `file.upload`. Binds an uploaded PNG as the doctor's stamp. */
export function setMySignature(fileId: string) {
  return requestData<AuthUser>("/me/signature", {
    method: "PATCH",
    ...json({ fileId }),
  });
}
