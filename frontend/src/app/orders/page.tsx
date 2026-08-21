"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Order } from "@/lib/order-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

function OrdersPageContent() {
  const { data: orders, loading, error } = useApiQuery(() => api.get<Order[]>("/customer/me/orders"));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/restaurants" className="text-slate-500 hover:text-slate-900">
            Browse restaurants
          </Link>
          <Link href="/profile" className="text-slate-500 hover:text-slate-900">
            My profile
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>

        <ErrorBanner message={error} />

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : orders?.length === 0 ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-400">You haven&apos;t placed any orders yet.</p>
            <Link href="/restaurants" className="mt-3 inline-block font-medium text-slate-900 underline">
              Browse restaurants
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {orders?.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
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
      </main>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth roles={["CUSTOMER"]}>
      <OrdersPageContent />
    </RequireAuth>
  );
}
