"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { DeliveryPartnerLedgerView } from "@/lib/delivery-partner-ledger-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";

export function EarningsSection() {
  const { data: ledger, loading, error } = useApiQuery(() => api.get<DeliveryPartnerLedgerView>("/delivery-partner/me/ledger"));

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Earnings</h2>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          <StatCard label="Lifetime earnings" value={`₹${ledger?.balance ?? "0.00"}`} accent="green" />
          {ledger?.entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              No earnings yet — complete a delivery to see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {ledger?.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <p className="text-sm text-slate-900">{entry.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleString()} {entry.payoutId ? "· Paid out" : "· Pending payout"}
                    </p>
                  </div>
                  <span className="font-semibold text-green-700">+₹{entry.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
