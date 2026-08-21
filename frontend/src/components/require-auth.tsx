"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { RoleName } from "@/lib/types";

/**
 * Wraps a portal's layout. Redirects to /login if unauthenticated, or to "/"
 * if the user's role isn't in `roles` — used per-portal (admin/restaurant)
 * rather than as global Next.js middleware, since role requirements differ
 * per route tree and the check needs the in-memory access token anyway.
 */
export function RequireAuth({ roles, children }: { roles?: RoleName[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [user, isLoading, roles, router]);

  const authorized = user && (!roles || roles.includes(user.role));

  if (isLoading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <p>Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
