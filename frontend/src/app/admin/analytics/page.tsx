"use client";

import { useState } from "react";
import { api, downloadAuthenticatedFile } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { AdminOverview, RevenuePoint, TopRestaurant, TopProduct, AnalyticsPeriod } from "@/lib/analytics-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "all"];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download(kind: "orders" | "revenue") {
    setDownloadError(null);
    setDownloading(kind);
    try {
      await downloadAuthenticatedFile(`/admin/reports/${kind}.csv?period=${period}`, `${kind}-${period}.csv`);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  }

  const { data: overview, loading: overviewLoading, error: overviewError } = useApiQuery(
    () => api.get<AdminOverview>(`/admin/analytics/overview?period=${period}`),
    [period],
  );
  const { data: revenue, error: revenueError } = useApiQuery(
    () => api.get<RevenuePoint[]>(`/admin/analytics/revenue?period=${period}`),
    [period],
  );
  const { data: topRestaurants, error: topRestaurantsError } = useApiQuery(
    () => api.get<TopRestaurant[]>(`/admin/analytics/top-restaurants?period=${period}`),
    [period],
  );
  const { data: topProducts, error: topProductsError } = useApiQuery(
    () => api.get<TopProduct[]>(`/admin/analytics/top-products?period=${period}`),
    [period],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Platform-wide revenue, orders, and ratings — computed live, no cached snapshots.</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm ${period === p ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
            >
              {p === "all" ? "All time" : p}
            </button>
          ))}
          <Button variant="secondary" loading={downloading === "orders"} onClick={() => download("orders")}>
            Orders CSV
          </Button>
          <Button variant="secondary" loading={downloading === "revenue"} onClick={() => download("revenue")}>
            Revenue CSV
          </Button>
        </div>
      </div>

      <ErrorBanner message={overviewError ?? downloadError} />

      {overviewLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : overview ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Orders" value={overview.totalOrders} accent="indigo" />
          <StatCard label="GMV" value={`₹${overview.gmv}`} accent="green" />
          <StatCard label="Commission Earned" value={`₹${overview.commissionEarned}`} accent="violet" />
          <StatCard label="Avg Order Value" value={`₹${overview.avgOrderValue}`} accent="blue" />
          <StatCard label="Active Customers" value={overview.activeCustomers} accent="amber" />
          <StatCard
            label="Platform Rating"
            value={overview.platformAvgRating !== null ? `★ ${overview.platformAvgRating} (${overview.platformReviewCount})` : "No reviews yet"}
            accent="rose"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">GMV by day</h2>
        <ErrorBanner message={revenueError} />
        <BarChart points={(revenue ?? []).map((r) => ({ label: r.date.slice(5, 10), value: Number(r.gmv) }))} label="Daily GMV" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Top restaurants</h2>
          <ErrorBanner message={topRestaurantsError} />
          {topRestaurants?.length === 0 ? (
            <p className="text-sm text-slate-400">No orders in this period yet.</p>
          ) : (
            <ul className="space-y-2">
              {topRestaurants?.map((r, i) => (
                <li key={r.restaurantId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {i + 1}. {r.restaurantName} <span className="text-slate-400">({r.orderCount} orders)</span>
                  </span>
                  <span className="font-medium text-slate-900">₹{r.gmv}</span>
                </li>
              ))}
            </ul>
          )}
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
    </div>
  );
}
