"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { AdminDashboardSummary } from "@/lib/dashboard-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PortalHero } from "@/components/ui/portal-hero";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: summary, loading, error } = useApiQuery(() =>
    api.get<AdminDashboardSummary>("/admin/dashboard/summary"),
  );

  return (
    <div className="space-y-8">
      <PortalHero
        title={`Welcome, ${user?.fullName}`}
        subtitle="Revenue, order, and delivery metrics land here as those modules come online. Restaurant and subscription stats below are already live."
      />

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
