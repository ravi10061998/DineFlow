"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { DeliveryAssignment } from "@/lib/delivery-assignment-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminDeliveryAssignmentsPage() {
  const { data: assignments, loading, error } = useApiQuery(() => api.get<DeliveryAssignment[]>("/admin/delivery-assignments"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Delivery Assignments</h1>
      <p className="mt-1 text-sm text-slate-500">
        Auto-assigned to the nearest online, approved delivery partner once a restaurant marks an order READY.
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
                <th className="px-4 py-3">Delivery partner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {assignments?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No delivery assignments yet.
                  </td>
                </tr>
              )}
              {assignments?.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.order?.orderNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{a.deliveryPartner?.user.fullName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{a.deliveredAt ? new Date(a.deliveredAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
