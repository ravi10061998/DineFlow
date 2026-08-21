"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { Order } from "@/lib/order-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

interface InitiateResult {
  paymentId: string;
  gatewayOrderId: string;
  amount: string;
  currency: string;
  gatewayKeyId: string;
}

export function PaymentPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [initiating, setInitiating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<InitiateResult | null>(null);

  if (order.paymentStatus === "REFUNDED") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        ↩ Refunded ₹{order.totalAmount} — this order was cancelled after payment.
      </div>
    );
  }

  if (order.status === "CANCELLED") return null; // cancelled, never paid — nothing to show

  if (order.paymentStatus === "PAID") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        ✓ Payment received.
      </div>
    );
  }

  async function handleInitiate() {
    setError(null);
    setInitiating(true);
    try {
      const result = await api.post<InitiateResult>(`/customer/me/orders/${order.id}/payment/initiate`);
      setPending(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInitiating(false);
    }
  }

  async function handleComplete(succeed: boolean) {
    if (!pending) return;
    setError(null);
    setCompleting(true);
    try {
      await api.post(`/customer/me/orders/${order.id}/payment/mock-complete`, { paymentId: pending.paymentId, succeed });
      setPending(null);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      onChanged(); // a failed attempt still changed order.paymentStatus — reflect it
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Payment</h2>
      {order.paymentStatus === "FAILED" && <p className="mb-2 text-sm text-red-600">Your last payment attempt failed — please try again.</p>}

      {!pending ? (
        <Button loading={initiating} onClick={handleInitiate}>
          Pay ₹{order.totalAmount}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
            No real payment gateway is configured in this environment — this simulates the checkout
            widget a customer would normally complete on the gateway&apos;s hosted page.
          </div>
          <p className="text-sm text-slate-600">
            Gateway order <code className="rounded bg-slate-100 px-1">{pending.gatewayOrderId}</code> — ₹{pending.amount} {pending.currency}
          </p>
          <div className="flex gap-2">
            <Button loading={completing} onClick={() => handleComplete(true)}>
              Simulate successful payment
            </Button>
            <Button variant="secondary" loading={completing} onClick={() => handleComplete(false)}>
              Simulate failed payment
            </Button>
          </div>
        </div>
      )}
      <ErrorBanner message={error} />
    </div>
  );
}
