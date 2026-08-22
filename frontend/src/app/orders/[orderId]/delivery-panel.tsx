"use client";

import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { DeliveryAssignment } from "@/lib/delivery-assignment-types";
import { StatusBadge } from "@/components/ui/status-badge";

const STATUS_LABEL: Record<DeliveryAssignment["status"], string> = {
  ASSIGNED: "Waiting for your delivery partner to accept",
  ACCEPTED: "Your delivery partner is on the way to the restaurant",
  REJECTED: "Looking for another delivery partner",
  PICKED_UP: "Your order is on the way",
  DELIVERED: "Delivered",
};

const ACTIVE_STATUSES: DeliveryAssignment["status"][] = ["ASSIGNED", "ACCEPTED", "PICKED_UP"];
const POLL_INTERVAL_MS = 15_000;

/** Only rendered once an order has reached READY — before that, there's nothing to show yet. */
export function DeliveryPanel({ orderId }: { orderId: string }) {
  const {
    data: assignment,
    loading,
    reload,
  } = useApiQuery(() => api.get<DeliveryAssignment | null>(`/customer/me/orders/${orderId}/delivery`), [orderId]);

  // Lightweight live-tracking: poll while the delivery is still in progress, stop once it's final.
  useEffect(() => {
    if (!assignment || !ACTIVE_STATUSES.includes(assignment.status)) return;
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [assignment, reload]);

  if (loading || !assignment) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Delivery</h2>
        <StatusBadge status={assignment.status} />
      </div>
      <p className="text-sm text-slate-600">{STATUS_LABEL[assignment.status]}</p>
      {assignment.deliveryPartner && (
        <p className="mt-1 text-sm text-slate-500">
          Partner: {assignment.deliveryPartner.user.fullName}
          {assignment.deliveryPartner.user.phone && ` · ${assignment.deliveryPartner.user.phone}`}
        </p>
      )}
      {ACTIVE_STATUSES.includes(assignment.status) && assignment.distanceRemainingKm != null && (
        <p className="mt-1 text-sm font-medium text-orange-700">📍 {assignment.distanceRemainingKm} km away from you right now</p>
      )}
      {assignment.status !== "DELIVERED" && assignment.status !== "REJECTED" && (
        <div className="mt-3 rounded-md border border-dashed border-orange-300 bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Share this code with your delivery partner to confirm handoff</p>
          <p className="mt-1 text-2xl font-bold tracking-widest text-orange-900">{assignment.deliveryOtp}</p>
        </div>
      )}
    </div>
  );
}
