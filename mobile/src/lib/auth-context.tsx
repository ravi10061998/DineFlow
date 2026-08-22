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
  /** True until the initial SecureStore-load + silent-refresh-on-launch attempt finishes. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** For the register flow, which calls its own endpoint then hands the resulting session here. */
  applySession: (user: AuthUser, tokens: TokenPair) => Promise<void>;
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
      await authStore.init();
      if (authStore.getRefreshToken()) {
        try {
          // No access token yet on a fresh app launch — this 401s once and
          // api-client's refresh-and-retry logic handles it transparently.
          const me = await api.get<AuthUser>("/auth/me");
          if (!cancelled) {
            await authStore.setSession(me, {
              accessToken: authStore.getAccessToken()!,
              refreshToken: authStore.getRefreshToken()!,
            });
          }
        } catch {
          await authStore.clear();
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
    await authStore.setSession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/auth/logout", { refreshToken: authStore.getRefreshToken() });
    } catch {
      // Best-effort — we're clearing the local session either way.
    } finally {
      await authStore.clear();
    }
  }

  async function applySession(nextUser: AuthUser, tokens: TokenPair): Promise<void> {
    await authStore.setSession(nextUser, tokens);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, applySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
