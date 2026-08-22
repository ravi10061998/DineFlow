"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { DeliveryPartnerPayout } from "@/lib/delivery-partner-ledger-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminDeliveryPartnerPayoutsPage() {
  const { data: payouts, loading, error, reload } = useApiQuery(() => api.get<DeliveryPartnerPayout[]>("/admin/delivery-partner-payouts"));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function retry(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.post(`/admin/delivery-partner-payouts/${id}/retry`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function runAll() {
    setActionError(null);
    setRunMessage(null);
    setRunningAll(true);
    try {
      const result = await api.post<DeliveryPartnerPayout[]>("/admin/delivery-partner-payouts/run-all");
      setRunMessage(`${result.length} payout(s) created.`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Delivery Partner Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">
            A flat rate per delivery, paid out on demand — sums every unpaid ledger entry for a partner, stamps it, and
            transfers it in one step.
          </p>
        </div>
        <Button onClick={runAll} loading={runningAll} className="shrink-0">
          Run payouts now
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <ErrorBanner message={error ?? actionError} />
        {runMessage && !actionError && <p className="text-sm text-green-700">{runMessage}</p>}
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Delivery partner</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failure reason</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No payouts yet — these are created when you run a payout for a partner with an unpaid balance.
                  </td>
                </tr>
              )}
              {payouts?.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.deliveryPartner?.user.fullName ?? p.deliveryPartnerId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">₹{p.amount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.failureReason ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {p.status === "FAILED" && (
                      <Button variant="secondary" loading={busyId === p.id} onClick={() => retry(p.id)}>
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
