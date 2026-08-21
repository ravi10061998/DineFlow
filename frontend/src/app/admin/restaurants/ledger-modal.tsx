"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Ledger } from "@/lib/ledger-types";
import { Modal } from "@/components/ui/modal";
import { ErrorBanner } from "@/components/ui/error-banner";

export function LedgerModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const { data: ledger, loading, error } = useApiQuery(
    () => api.get<Ledger>(`/admin/restaurants/${restaurantId}/ledger`),
    [restaurantId],
  );

  return (
    <Modal title="Ledger" onClose={onClose}>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-medium text-slate-700">Current balance</span>
            <span className="text-lg font-semibold text-slate-900">₹{ledger?.balance}</span>
          </div>
          {ledger?.entries.length === 0 ? (
            <p className="text-slate-400">No ledger activity yet.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {ledger?.entries.map((entry) => {
                const isCredit = entry.type === "ORDER_CREDIT";
                return (
                  <li key={entry.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-slate-900">{entry.description}</p>
                      <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`font-medium ${isCredit ? "text-green-700" : "text-red-600"}`}>
                      {isCredit ? "+" : ""}₹{entry.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
