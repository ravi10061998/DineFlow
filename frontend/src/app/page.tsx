"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

// Subtle repeating dot pattern, inlined as a data URI — no network request,
// never breaks, always renders identically. Swap for a real photo later by
// dropping a file in `public/` and pointing an <Image> at it instead.
const DOT_PATTERN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='2' cy='2' r='1.6' fill='white' fill-opacity='0.35'/%3E%3C/svg%3E";

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700">
        {/* Soft glow blobs for depth */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-yellow-300 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-rose-500 opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-amber-400 opacity-30 blur-3xl" />
        {/* Subtle dot texture */}
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: `url("${DOT_PATTERN}")` }} />

        <header className="relative z-10 flex items-center justify-between px-6 py-4">
          <Logo variant="light" />
          <nav className="flex items-center gap-4 text-sm">
            {!isLoading && user ? (
              <Link
                href={user.role === "ADMIN" ? "/admin" : user.role.startsWith("RESTAURANT") ? "/restaurant" : "/profile"}
                className="rounded-md bg-white px-4 py-2 font-medium text-slate-900 shadow-sm transition hover:bg-amber-50"
              >
                {user.role === "CUSTOMER" ? "My Profile" : "Go to dashboard"}
              </Link>
            ) : (
              <>
                <Link href="/login" className="font-medium text-white/90 hover:text-white">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-white px-4 py-2 font-medium text-slate-900 shadow-sm transition hover:bg-amber-50"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        <main className="relative z-10 flex flex-col items-center justify-center gap-5 px-6 py-28 text-center sm:py-36">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            Order from restaurants near you
          </h1>
          <p className="max-w-md text-orange-50">
            Browse menus and build a cart today — checkout is built out in a later module.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/restaurants"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-amber-50"
            >
              Browse restaurants →
            </Link>
            <Link
              href="/register-restaurant"
              className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/20"
            >
              Own a restaurant? Register it here →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
