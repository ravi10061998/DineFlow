"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Refund } from "@/lib/refund-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminRefundsPage() {
  const { data: refunds, loading, error } = useApiQuery(() => api.get<Refund[]>("/admin/refunds"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Refunds</h1>
      <p className="mt-1 text-sm text-slate-500">
        Automatic refunds for orders cancelled after payment, read-only.
      </p>

      <div className="mt-4">
        <ErrorBanner message={error} />
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {refunds?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No refunds issued yet.
                  </td>
                </tr>
              )}
              {refunds?.map((refund) => (
                <tr key={refund.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{refund.order?.orderNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(refund.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">₹{refund.amount}</td>
                  <td className="px-4 py-3 text-slate-500">{refund.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={refund.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{refund.failureReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
