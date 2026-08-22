"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { NotificationDelivery } from "@/lib/notification-delivery-types";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminNotificationDeliveriesPage() {
  const { data: deliveries, loading, error } = useApiQuery(() => api.get<NotificationDelivery[]>("/admin/notification-deliveries"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Notification Deliveries</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every email/SMS this platform has attempted to send — verification codes, password resets, trial
        reminders, order/payment/refund updates — read-only, useful for debugging a "did the customer get
        this?" question.
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
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Subject / Body</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No deliveries yet.
                  </td>
                </tr>
              )}
              {deliveries?.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{d.channel}</td>
                  <td className="px-4 py-3 text-slate-900">{d.recipient}</td>
                  <td className="px-4 py-3 max-w-sm text-slate-600">
                    {d.subject && <p className="font-medium text-slate-800">{d.subject}</p>}
                    <p className="truncate text-xs text-slate-500">{d.body}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{d.relatedType ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.status === "SENT" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {d.status}
                    </span>
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
