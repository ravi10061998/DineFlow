import type { AuthUser, TokenPair } from "./types";

/**
 * Plain (non-React) singleton holding the current session. `api-client.ts`
 * reads/writes this directly (it isn't a hook, so it can't use context) and
 * `auth-context.tsx` wraps it with `useSyncExternalStore` for components.
 *
 * Access token: memory only, lost on refresh/close (that's the point).
 * Refresh token: localStorage, so a page reload doesn't force a re-login.
 * See dineflow-project memory / README for why this isn't httpOnly cookies
 * yet — that's Module 37 (Security Hardening).
 */

const REFRESH_TOKEN_STORAGE_KEY = "df_refresh_token";

let accessToken: string | null = null;
let refreshToken: string | null = typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) : null;
let user: AuthUser | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((listener) => listener());

export const authStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  getUser: () => user,

  setSession(nextUser: AuthUser | null, tokens: TokenPair | null) {
    user = nextUser;
    accessToken = tokens?.accessToken ?? null;
    refreshToken = tokens?.refreshToken ?? null;
    if (typeof window !== "undefined") {
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    }
    notify();
  },

  clear() {
    this.setSession(null, null);
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
