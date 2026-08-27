import type { ReactNode } from "react";

// Same inlined dot pattern as the public homepage hero — no network dependency, always renders.
const DOT_PATTERN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='2' cy='2' r='1.6' fill='white' fill-opacity='0.35'/%3E%3C/svg%3E";

/**
 * The brand-gradient welcome banner, shared by every "home" screen (admin dashboard,
 * restaurant dashboard, customer profile) so all three feel like one product rather
 * than three differently-styled apps bolted together.
 */
export function PortalHero({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 px-5 py-6 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-yellow-300 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-rose-500 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: `url("${DOT_PATTERN}")` }} />
      <div className="relative z-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-2 max-w-xl text-sm text-orange-50 sm:text-base">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}
