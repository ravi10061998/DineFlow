"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Settlement } from "@/lib/settlement-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminSettlementsPage() {
  const { data: settlements, loading, error, reload } = useApiQuery(() => api.get<Settlement[]>("/admin/settlements"));
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function handleRunAll() {
    setRunning(true);
    setRunError(null);
    setRunMessage(null);
    try {
      const result = await api.post<Settlement[]>("/admin/settlements/run-all");
      setRunMessage(`${result.length} settlement(s) created.`);
      reload();
    } catch (err) {
      setRunError(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settlements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every settlement run locks in a restaurant&apos;s unsettled ledger balance for a period. Runs automatically every
            week — trigger it manually here for testing or an off-cycle run.
          </p>
        </div>
        <Button onClick={handleRunAll} loading={running} className="shrink-0">
          Run settlements now
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <ErrorBanner message={error ?? runError} />
        {runMessage && !runError && <p className="text-sm text-green-700">{runMessage}</p>}
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {settlements?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No settlements have been run yet.
                  </td>
                </tr>
              )}
              {settlements?.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.restaurant?.name ?? s.restaurantId}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">₹{s.amount}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
