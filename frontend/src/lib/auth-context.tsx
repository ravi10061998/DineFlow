"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { authStore } from "./auth-store";
import { api } from "./api-client";
import type { AuthUser, TokenPair } from "./types";

interface LoginResult {
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the initial silent-refresh-on-load attempt finishes. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  /** For register flows (customer/restaurant) that call their own endpoint, then hand the resulting session here. */
  applySession: (user: AuthUser, tokens: TokenPair) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(
    authStore.subscribe,
    () => authStore.getUser(),
    () => null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (authStore.getRefreshToken()) {
        try {
          // No access token on a fresh page load — this 401s once and
          // api-client's refresh-and-retry logic handles it transparently.
          const me = await api.get<AuthUser>("/auth/me");
          if (!cancelled) {
            authStore.setSession(me, {
              accessToken: authStore.getAccessToken()!,
              refreshToken: authStore.getRefreshToken()!,
            });
          }
        } catch {
          authStore.clear();
        }
      }
      if (!cancelled) setIsLoading(false);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const data = await api.post<LoginResult & TokenPair>(
      "/auth/login",
      { email, password },
      { skipAuth: true },
    );
    authStore.setSession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/auth/logout", { refreshToken: authStore.getRefreshToken() });
    } catch {
      // Best-effort — we're clearing the local session either way.
    } finally {
      authStore.clear();
    }
  }

  function hasPermission(permission: string): boolean {
    return authStore.getUser()?.permissions?.includes(permission) ?? false;
  }

  function applySession(nextUser: AuthUser, tokens: TokenPair): void {
    authStore.setSession(nextUser, tokens);
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission, applySession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
