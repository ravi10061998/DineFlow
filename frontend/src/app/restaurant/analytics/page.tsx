"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { RestaurantOverview, RevenuePoint, TopProduct, AnalyticsPeriod } from "@/lib/analytics-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { BarChart } from "@/components/ui/bar-chart";

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "all"];

export default function RestaurantAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const { data: overview, loading: overviewLoading, error: overviewError } = useApiQuery(
    () => api.get<RestaurantOverview>(`/restaurant/me/analytics/overview?period=${period}`),
    [period],
  );
  const { data: revenue, error: revenueError } = useApiQuery(
    () => api.get<RevenuePoint[]>(`/restaurant/me/analytics/revenue?period=${period}`),
    [period],
  );
  const { data: topProducts, error: topProductsError } = useApiQuery(
    () => api.get<TopProduct[]>(`/restaurant/me/analytics/top-products?period=${period}`),
    [period],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Your own revenue, payouts, and ratings — computed live.</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm ${period === p ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
            >
              {p === "all" ? "All time" : p}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={overviewError} />

      {overviewLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : overview ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Orders" value={overview.totalOrders} accent="indigo" />
          <StatCard label="Revenue" value={`₹${overview.revenue}`} accent="green" />
          <StatCard label="Your Payout" value={`₹${overview.payout}`} accent="blue" />
          <StatCard label="Avg Order Value" value={`₹${overview.avgOrderValue}`} accent="violet" />
          <StatCard label="Rating" value={overview.avgRating !== null ? `★ ${overview.avgRating} (${overview.reviewCount})` : "No reviews yet"} accent="amber" />
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Revenue by day</h2>
        <ErrorBanner message={revenueError} />
        <BarChart points={(revenue ?? []).map((r) => ({ label: r.date.slice(5, 10), value: Number(r.revenue) }))} label="Daily revenue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Top products</h2>
        <ErrorBanner message={topProductsError} />
        {topProducts?.length === 0 ? (
          <p className="text-sm text-slate-400">No orders in this period yet.</p>
        ) : (
          <ul className="space-y-2">
            {topProducts?.map((p, i) => (
              <li key={p.productName + i} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {i + 1}. {p.productName} <span className="text-slate-400">({p.unitsSold} sold)</span>
                </span>
                <span className="font-medium text-slate-900">₹{p.revenue}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
