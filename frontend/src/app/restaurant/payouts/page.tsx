"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Payout } from "@/lib/payout-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantPayoutsPage() {
  const { data: payouts, loading, error } = useApiQuery(() => api.get<Payout[]>("/restaurant/me/payouts"));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payouts</h1>
        <p className="mt-1 text-sm text-slate-500">The actual transfer for each of your settlements.</p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : payouts?.length === 0 ? (
        <p className="text-slate-400">No payouts yet — one is created automatically each time a settlement runs.</p>
      ) : (
        <ul className="space-y-2">
          {payouts?.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">₹{p.amount}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-slate-500">{new Date(p.createdAt).toLocaleString()}</p>
                {p.status === "FAILED" && p.failureReason && <p className="mt-1 text-xs text-red-600">{p.failureReason}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
