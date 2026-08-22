import { secureStorage } from "./secure-storage";
import type { AuthUser, TokenPair } from "./types";

/**
 * Plain (non-React) singleton, same shape as frontend/src/lib/auth-store.ts's — mirrored
 * deliberately so api-client.ts's refresh-and-retry logic reads identically on both apps.
 *
 * Access token: memory only, same as web.
 * Refresh token: expo-secure-store (Keychain on iOS, Keystore-backed EncryptedSharedPreferences
 * on Android) instead of localStorage — the RN equivalent, and strictly more resistant to
 * extraction than localStorage ever was on web.
 *
 * Unlike localStorage, SecureStore has no synchronous read, so the refresh token can't be
 * loaded at module-init time the way web does — callers must `await authStore.init()` once
 * before trusting `getRefreshToken()` (auth-context.tsx's bootstrap effect does this).
 */

const REFRESH_TOKEN_KEY = "df_refresh_token";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let user: AuthUser | null = null;
let initialized = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((listener) => listener());

export const authStore = {
  async init(): Promise<void> {
    if (initialized) return;
    try {
      refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      refreshToken = null;
    }
    initialized = true;
  },

  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  getUser: () => user,

  async setSession(nextUser: AuthUser | null, tokens: TokenPair | null): Promise<void> {
    user = nextUser;
    accessToken = tokens?.accessToken ?? null;
    refreshToken = tokens?.refreshToken ?? null;
    try {
      if (refreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await secureStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Best-effort persistence — the in-memory session is still correct for this app run.
    }
    notify();
  },

  async clear(): Promise<void> {
    await this.setSession(null, null);
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
