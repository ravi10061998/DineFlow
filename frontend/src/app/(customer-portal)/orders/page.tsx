"use client";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Order } from "@/lib/order-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function OrdersPage() {
  const { data: orders, loading, error } = useApiQuery(() => api.get<Order[]>("/customer/me/orders"));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : orders?.length === 0 ? (
        <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-400">You haven&apos;t placed any orders yet.</p>
          <Link href="/restaurants" className="mt-3 inline-block font-medium text-slate-900 underline">
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="max-w-2xl space-y-2">
          {orders?.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{order.orderNumber}</span>
                  <div className="flex gap-1.5">
                    <StatusBadge status={order.paymentStatus} />
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                  <span className="font-medium text-slate-700">₹{order.totalAmount}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
