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

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayScriptPromise: Promise<void> | null = null;

/** Loaded once per page, reused across repeated payment attempts on the same order-detail view. */
function loadRazorpayCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load the payment widget. Check your connection and try again."));
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
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

  // A real Razorpay key always starts with rzp_ (rzp_test_/rzp_live_) -- the mock's own key id
  // (PAYMENT_GATEWAY_KEY_ID, default "mock_key_id_dev") never does. This is the one place the
  // frontend needs to know which gateway is actually active, and it reads that from data the
  // backend already returns rather than needing its own separate "is this real" config.
  const isRealGateway = (keyId: string) => keyId.startsWith("rzp_");

  async function openRealCheckout(result: InitiateResult) {
    try {
      await loadRazorpayCheckout();
    } catch (err) {
      setError(getErrorMessage(err));
      return;
    }
    if (!window.Razorpay) {
      setError("Payment widget failed to load.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: result.gatewayKeyId,
      amount: Math.round(Number(result.amount) * 100),
      currency: result.currency,
      name: "DineFlow",
      description: `Order ${order.orderNumber}`,
      order_id: result.gatewayOrderId,
      prefill: { name: order.deliveryReceiverName, contact: order.deliveryReceiverPhone },
      theme: { color: "#ea580c" },
      handler: (response: unknown) => void handleVerify(result.paymentId, response as RazorpaySuccessResponse),
      modal: {
        // Not an error -- the customer can reopen the widget any time via "Pay ₹…" again, since
        // this payment row stays CREATED (never touched) until a real callback resolves it.
        ondismiss: () => setPending(null),
      },
    });

    razorpay.on("payment.failed", () => {
      setError("Payment failed or was cancelled.");
      onChanged(); // the gateway's own webhook/redirect may still resolve this payment as FAILED — reflect current state
    });

    razorpay.open();
  }

  async function handleInitiate() {
    setError(null);
    setInitiating(true);
    try {
      const result = await api.post<InitiateResult>(`/customer/me/orders/${order.id}/payment/initiate`);
      setPending(result);
      if (isRealGateway(result.gatewayKeyId)) {
        await openRealCheckout(result);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInitiating(false);
    }
  }

  async function handleVerify(paymentId: string, response: RazorpaySuccessResponse) {
    setError(null);
    setCompleting(true);
    try {
      await api.post(`/customer/me/orders/${order.id}/payment/verify`, {
        paymentId,
        gatewayPaymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
      setPending(null);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      onChanged(); // a failed verification still changed order.paymentStatus — reflect it
    } finally {
      setCompleting(false);
    }
  }

  async function handleMockComplete(succeed: boolean) {
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

  const showMockPanel = pending && !isRealGateway(pending.gatewayKeyId);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Payment</h2>
      {order.paymentStatus === "FAILED" && <p className="mb-2 text-sm text-red-600">Your last payment attempt failed — please try again.</p>}

      {!showMockPanel ? (
        <Button loading={initiating || completing} onClick={handleInitiate}>
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
            <Button loading={completing} onClick={() => handleMockComplete(true)}>
              Simulate successful payment
            </Button>
            <Button variant="secondary" loading={completing} onClick={() => handleMockComplete(false)}>
              Simulate failed payment
            </Button>
          </div>
        </div>
      )}
      <ErrorBanner message={error} />
    </div>
  );
}
