"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Order } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PaymentPanel } from "./payment-panel";
import { DeliveryPanel } from "./delivery-panel";

function OrderDetailContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, loading, error, reload } = useApiQuery(() => api.get<Order>(`/customer/me/orders/${orderId}`), [orderId]);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm("Cancel this order?")) return;
    setCancelError(null);
    setCancelling(true);
    try {
      await api.patch(`/customer/me/orders/${orderId}/cancel`, {});
      reload();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/orders" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          All orders
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <ErrorBanner message={error} />

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : order ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-slate-900">{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</p>
            {order.cancellationReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Cancelled: {order.cancellationReason}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Items</h2>
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    {item.variantName && <p className="text-sm text-slate-500">{item.variantName}</p>}
                    {item.addons.length > 0 && <p className="text-sm text-slate-500">+ {item.addons.map((a) => a.name).join(", ")}</p>}
                    <p className="text-sm text-slate-600">
                      ₹{item.unitPrice} × {item.quantity} = ₹{item.lineTotal}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    Delivery fee
                    {order.deliveryDistanceKm && <span className="text-xs text-slate-400"> ({order.deliveryDistanceKm} km)</span>}
                  </span>
                  <span>{Number(order.deliveryFee) === 0 ? "Free" : `₹${order.deliveryFee}`}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex items-center justify-between text-green-700">
                    <span>Coupon {order.couponCode}</span>
                    <span>-₹{order.discountAmount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-1 font-semibold text-slate-900">
                  <span>Total</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </div>
            </div>

            <PaymentPanel order={order} onChanged={reload} />
            <DeliveryPanel orderId={orderId} />

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Delivering to</h2>
              <p className="text-sm text-slate-900">{order.deliveryReceiverName}</p>
              <p className="text-sm text-slate-500">{order.deliveryReceiverPhone}</p>
              <p className="text-sm text-slate-600">
                {order.deliveryAddressLine1}
                {order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ""}
              </p>
              <p className="text-sm text-slate-600">
                {order.deliveryCity}, {order.deliveryState} {order.deliveryPostalCode}
              </p>
            </div>

            <ErrorBanner message={cancelError} />
            {order.status === "PLACED" && (
              <Button variant="danger" loading={cancelling} onClick={handleCancel}>
                Cancel order
              </Button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth roles={["CUSTOMER"]}>
      <OrderDetailContent />
    </RequireAuth>
  );
}
