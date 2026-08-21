import { authStore } from "./auth-store";
import type { ApiEnvelope } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Skip attaching the Authorization header — for login/register/refresh themselves. */
  skipAuth?: boolean;
}

async function rawRequest<T>(path: string, options: ApiFetchOptions, accessToken: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

// Multiple 401s can fire at once (parallel requests) — share one in-flight refresh.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const currentRefreshToken = authStore.getRefreshToken();
      if (!currentRefreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
        if (!res.ok) return false;
        const body: ApiEnvelope<{ accessToken: string; refreshToken: string }> = await res.json();
        authStore.setSession(authStore.getUser(), body.data);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let res = await rawRequest<T>(path, options, authStore.getAccessToken());

  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await rawRequest<T>(path, options, authStore.getAccessToken());
    } else {
      authStore.clear();
    }
  }

  const body: ApiEnvelope<T> = await res.json().catch(() => null as never);
  if (!body || !res.ok || !body.success) {
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.message ?? `Request failed with status ${res.status}`,
      res.status,
      body?.error?.details,
    );
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown, options: ApiFetchOptions = {}) =>
    apiFetch<T>(path, { ...options, method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => apiFetch<T>(path, { method: "POST", body: formData }),
};
