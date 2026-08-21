"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { AdminDashboardSummary } from "@/lib/dashboard-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";

// Same inlined dot pattern as the homepage hero — no network dependency, always renders.
const DOT_PATTERN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='2' cy='2' r='1.6' fill='white' fill-opacity='0.35'/%3E%3C/svg%3E";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: summary, loading, error } = useApiQuery(() =>
    api.get<AdminDashboardSummary>("/admin/dashboard/summary"),
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner — same brand gradient as the public homepage, for visual consistency across the product. */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 px-8 py-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-yellow-300 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-rose-500 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: `url("${DOT_PATTERN}")` }} />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">Welcome, {user?.fullName}</h1>
          <p className="mt-2 max-w-xl text-orange-50">
            Revenue, order, and delivery metrics land here as those modules come online. Restaurant and subscription
            stats below are already live.
          </p>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading dashboard…</p>
      ) : summary ? (
        <>
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Restaurants</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total" value={summary.totalRestaurants} accent="indigo" />
              <StatCard label="Pending Approval" value={summary.restaurantsByStatus.PENDING} accent="amber" />
              <StatCard label="Approved" value={summary.restaurantsByStatus.APPROVED} accent="green" />
              <StatCard label="Suspended" value={summary.restaurantsByStatus.SUSPENDED} accent="rose" />
              <StatCard label="Blocked" value={summary.restaurantsByStatus.BLOCKED} accent="rose" />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Subscriptions</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="On Trial" value={summary.subscriptionsByStatus.TRIAL} accent="blue" />
              <StatCard label="Active" value={summary.subscriptionsByStatus.ACTIVE} accent="green" />
              <StatCard label="Past Due" value={summary.subscriptionsByStatus.PAST_DUE} accent="amber" />
              <StatCard label="Cancelled" value={summary.subscriptionsByStatus.CANCELLED} accent="rose" />
              <StatCard label="Active Plans" value={summary.activePlanCount} accent="violet" />
            </div>
          </div>

          {summary.restaurantsByStatus.PENDING > 0 && (
            <Link
              href="/admin/restaurants"
              className="block rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
            >
              {summary.restaurantsByStatus.PENDING} restaurant{summary.restaurantsByStatus.PENDING === 1 ? "" : "s"}{" "}
              waiting for approval →
            </Link>
          )}
        </>
      ) : null}
    </div>
  );
}
