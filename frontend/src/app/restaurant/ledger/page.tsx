"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Ledger } from "@/lib/ledger-types";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantLedgerPage() {
  const { data: ledger, loading, error } = useApiQuery(() => api.get<Ledger>("/restaurant/me/ledger"));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ledger</h1>
        <p className="mt-1 text-sm text-slate-500">What the platform currently owes you, and how it got there.</p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <StatCard label="Current balance" value={`₹${ledger?.balance}`} accent="green" />

          {ledger?.entries.length === 0 ? (
            <p className="text-slate-400">No ledger activity yet — entries appear here once orders are paid for.</p>
          ) : (
            <ul className="space-y-2">
              {ledger?.entries.map((entry) => {
                const isCredit = entry.type === "ORDER_CREDIT";
                return (
                  <li key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <div>
                      <p className="font-medium text-slate-900">{entry.description}</p>
                      <p className="text-sm text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-lg font-semibold ${isCredit ? "text-green-700" : "text-red-600"}`}>
                      {isCredit ? "+" : ""}₹{entry.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
