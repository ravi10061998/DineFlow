"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { useAuth } from "@/lib/auth-context";
import { getErrorMessage } from "@/lib/errors";
import type { Ledger } from "@/lib/ledger-types";
import type { Settlement } from "@/lib/settlement-types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

export function LedgerModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const { hasPermission } = useAuth();
  const { data: ledger, loading, error, reload } = useApiQuery(
    () => api.get<Ledger>(`/admin/restaurants/${restaurantId}/ledger`),
    [restaurantId],
  );
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function handleRunSettlement() {
    setRunning(true);
    setRunError(null);
    setRunMessage(null);
    try {
      const settlement = await api.post<Settlement | null>(`/admin/restaurants/${restaurantId}/settlements/run`);
      setRunMessage(settlement ? `Settlement created for ₹${settlement.amount}.` : "Nothing to settle — balance is already fully settled.");
      reload();
    } catch (err) {
      setRunError(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal title="Ledger" onClose={onClose}>
      <ErrorBanner message={error ?? runError} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-medium text-slate-700">Current balance</span>
            <span className="text-lg font-semibold text-slate-900">₹{ledger?.balance}</span>
          </div>

          {hasPermission("ledger:manage") && (
            <div className="mb-4 flex items-center gap-3">
              <Button variant="secondary" loading={running} onClick={handleRunSettlement}>
                Run settlement now
              </Button>
              {runMessage && <span className="text-sm text-green-700">{runMessage}</span>}
            </div>
          )}
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
