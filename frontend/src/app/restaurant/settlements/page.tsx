"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Settlement } from "@/lib/settlement-types";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantSettlementsPage() {
  const { data: settlements, loading, error } = useApiQuery(() => api.get<Settlement[]>("/restaurant/me/settlements"));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settlements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every settlement locks in your ledger balance for a period — see the <span className="font-medium">Ledger</span> page for
          activity not yet included in one.
        </p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : settlements?.length === 0 ? (
        <p className="text-slate-400">No settlements yet — these run automatically once a week.</p>
      ) : (
        <ul className="space-y-2">
          {settlements?.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-500">Settled {new Date(s.createdAt).toLocaleString()}</p>
              </div>
              <span className="text-lg font-semibold text-slate-900">₹{s.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
