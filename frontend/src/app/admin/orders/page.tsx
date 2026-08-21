"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Order } from "@/lib/order-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminOrdersPage() {
  const { data: orders, loading, error } = useApiQuery(() => api.get<Order[]>("/admin/orders"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
      <p className="mt-1 text-sm text-slate-500">Platform-wide order oversight, read-only.</p>

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
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No orders yet.
                  </td>
                </tr>
              )}
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">₹{order.subtotal}</td>
                  <td className="px-4 py-3 text-slate-600">₹{order.commissionAmount}</td>
                  <td className="px-4 py-3 text-slate-600">₹{order.restaurantPayoutAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
