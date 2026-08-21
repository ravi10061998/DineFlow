"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { WebhookEvent } from "@/lib/webhook-types";
import { ErrorBanner } from "@/components/ui/error-banner";

function outcomeLabel(event: WebhookEvent): { text: string; className: string } {
  if (!event.signatureValid) return { text: "Invalid signature", className: "bg-red-100 text-red-800" };
  if (event.processingError) return { text: "Processing error", className: "bg-orange-100 text-orange-800" };
  if (event.processedAt) return { text: "Processed", className: "bg-green-100 text-green-800" };
  return { text: "Received", className: "bg-amber-100 text-amber-800" };
}

export default function AdminWebhooksPage() {
  const { data: events, loading, error } = useApiQuery(() => api.get<WebhookEvent[]>("/admin/webhooks"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Webhook Deliveries</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every payment-gateway webhook this platform has received, read-only — invisible infrastructure to
        customers, but useful for debugging delivery issues.
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
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {events?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No webhook deliveries yet.
                  </td>
                </tr>
              )}
              {events?.map((event) => {
                const outcome = outcomeLabel(event);
                return (
                  <tr key={event.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{event.gateway}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{event.eventType}</td>
                    <td className="px-4 py-3 text-slate-400">
                      <code className="text-xs">{event.gatewayEventId}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${outcome.className}`}>{outcome.text}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{event.processingError ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
