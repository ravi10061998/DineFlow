"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Payment } from "@/lib/payment-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminPaymentsPage() {
  const { data: payments, loading, error } = useApiQuery(() => api.get<Payment[]>("/admin/payments"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
      <p className="mt-1 text-sm text-slate-500">Every payment attempt across the platform, read-only.</p>

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
                <th className="px-4 py-3">Attempted</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failure reason</th>
              </tr>
            </thead>
            <tbody>
              {payments?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No payment attempts yet.
                  </td>
                </tr>
              )}
              {payments?.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{payment.order?.orderNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(payment.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{payment.gateway}</td>
                  <td className="px-4 py-3 text-slate-600">
                    ₹{payment.amount} {payment.currency}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{payment.failureReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
