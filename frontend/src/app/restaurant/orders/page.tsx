"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import { NEXT_STATUS, CANCELLABLE_BY_RESTAURANT, type Order } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantOrdersPage() {
  const { data: orders, loading, error, reload } = useApiQuery(() => api.get<Order[]>("/restaurant/me/orders"));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setActionError(null);
    setBusyId(order.id);
    try {
      await api.patch(`/restaurant/me/orders/${order.id}/status`, { status: next });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(order: Order) {
    const reason = window.prompt("Reason for cancelling this order?");
    if (!reason) return;
    setActionError(null);
    setBusyId(order.id);
    try {
      await api.patch(`/restaurant/me/orders/${order.id}/cancel`, { reason });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Incoming orders and their fulfillment status.</p>
      </div>

      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : orders?.length === 0 ? (
        <p className="text-slate-400">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders?.map((order) => {
            const next = NEXT_STATUS[order.status];
            const canCancel = CANCELLABLE_BY_RESTAURANT.includes(order.status);
            const expanded = expandedId === order.id;
            return (
              <li key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString()} · ₹{order.totalAmount} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={() => setExpandedId(expanded ? null : order.id)}>
                      {expanded ? "Hide" : "Details"}
                    </Button>
                    {next && (
                      <Button loading={busyId === order.id} onClick={() => advance(order)}>
                        Mark {next.replace(/_/g, " ").toLowerCase()}
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="danger" loading={busyId === order.id} onClick={() => cancel(order)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <ul className="space-y-1 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}× {item.productName}
                          {item.variantName ? ` (${item.variantName})` : ""}
                          {item.addons.length > 0 ? ` + ${item.addons.map((a) => a.name).join(", ")}` : ""} — ₹{item.lineTotal}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-slate-600">
                      Deliver to: {order.deliveryReceiverName}, {order.deliveryAddressLine1}, {order.deliveryCity}
                    </p>
                    <p className="text-sm text-slate-500">
                      Subtotal ₹{order.subtotal} — Commission ₹{order.commissionAmount} — Your payout ₹{order.restaurantPayoutAmount}
                    </p>
                    {order.cancellationReason && <p className="text-sm text-red-600">Cancelled: {order.cancellationReason}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
