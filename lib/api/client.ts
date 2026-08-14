import { ApiError, type ApiErrorBody, type ApiSuccess, type Page } from "@/lib/types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://192.168.100.166:4000"
).replace(/\/$/, "");

export const SESSION_EXPIRED_EVENT = "dental:session-expired";

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

/** Concurrent 401s must share one refresh call, not stampede the endpoint. */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

interface RawResponse {
  status: number;
  body: unknown;
}

async function send(path: string, init: RequestInit, allowRefresh: boolean): Promise<RawResponse> {
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const isAuthRoute = path.startsWith("/auth/");

  if (response.status === 401 && allowRefresh && !isAuthRoute) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      return send(path, init, false);
    }
    notifySessionExpired();
  }

  // 204 responses carry no body at all; parsing them would throw.
  if (response.status === 204 || response.status === 205) {
    if (!response.ok) {
      throw new ApiError(response.status, `Request failed (${response.status})`);
    }
    return { status: response.status, body: null };
  }

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const errorBody = (body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      response.status,
      errorBody.error ?? defaultErrorMessage(response.status),
      errorBody.details,
    );
  }

  return { status: response.status, body };
}

function defaultErrorMessage(status: number) {
  switch (status) {
    case 401:
      return "Your session has expired";
    case 403:
      return "You are not permitted to do that";
    case 404:
      return "Not found";
    case 413:
      return "That file is too large";
    case 415:
      return "That file type is not supported";
    case 429:
      return "Too many requests. Try again in a few minutes.";
    default:
      return `Request failed (${status})`;
  }
}

function envelope<T>(body: unknown): ApiSuccess<T> {
  return (body ?? {}) as ApiSuccess<T>;
}

/** Endpoint returns `{ success, data: T }` — unwraps to `T`. */
export async function requestData<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { body } = await send(path, init, true);
  const parsed = envelope<T>(body);

  if (parsed.data === undefined) {
    throw new ApiError(500, "The server response did not include a data payload");
  }
  return parsed.data;
}

/** Endpoint returns `{ success, data: T[], meta }` — unwraps to `Page<T>`. */
export async function requestPage<T>(path: string, init: RequestInit = {}): Promise<Page<T>> {
  const { body } = await send(path, init, true);
  const parsed = envelope<T[]>(body);
  const data = parsed.data ?? [];

  return {
    data,
    meta:
      parsed.meta ?? {
        totalCount: data.length,
        page: 1,
        limit: data.length,
        totalPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
  };
}

/** Endpoint returns `{ success, message }` — unwraps to the message string. */
export async function requestMessage(path: string, init: RequestInit = {}): Promise<string> {
  const { body } = await send(path, init, true);
  return envelope<never>(body).message ?? "Done";
}

/** Endpoint returns 204 with an empty body. */
export async function requestVoid(path: string, init: RequestInit = {}): Promise<void> {
  await send(path, init, true);
}

/**
 * Endpoint replies without the `{ success, ... }` envelope. Only `/visits/me`
 * and `/health` behave this way.
 */
export async function requestRaw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { body } = await send(path, init, true);
  return body as T;
}

export function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

export function getApiUrl() {
  return API_URL;
}
