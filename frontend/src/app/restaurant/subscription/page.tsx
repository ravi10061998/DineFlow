"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { RestaurantSubscription, SubscriptionPlan } from "@/lib/subscription-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

function daysRemaining(dateString: string | null): number | null {
  if (!dateString) return null;
  const ms = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function RestaurantSubscriptionPage() {
  const {
    data: subscription,
    loading: loadingSub,
    error: subError,
    reload: reloadSub,
  } = useApiQuery(() => api.get<RestaurantSubscription | null>("/restaurant/me/subscription"));
  const { data: plans, loading: loadingPlans } = useApiQuery(() => api.get<SubscriptionPlan[]>("/restaurant/me/available-plans"));
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    setActionError(null);
    setBusyPlanId(planId);
    try {
      await api.post("/restaurant/me/subscription/subscribe", { planId });
      reloadSub();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel your current subscription?")) return;
    setActionError(null);
    try {
      await api.post("/restaurant/me/subscription/cancel");
      reloadSub();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  const trialDaysLeft = subscription?.status === "TRIAL" ? daysRemaining(subscription.trialEndsAt) : null;

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Subscription</h1>

      <ErrorBanner message={subError ?? actionError} />

      {loadingSub ? (
        <p className="text-slate-500">Loading…</p>
      ) : !subscription ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No subscription yet — this starts automatically once your restaurant is approved.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <StatusBadge status={subscription.status} />
            {subscription.plan && <span className="font-medium text-slate-900">{subscription.plan.name}</span>}
          </div>
          {subscription.status === "TRIAL" && (
            <p className="mt-2 text-sm text-slate-600">
              {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your free trial (ends{" "}
              {new Date(subscription.trialEndsAt!).toLocaleDateString()}).
            </p>
          )}
          {subscription.status === "ACTIVE" && subscription.currentPeriodEnd && (
            <p className="mt-2 text-sm text-slate-600">
              Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()} · ₹{subscription.priceSnapshot} ·{" "}
              {subscription.commissionValueSnapshot}
              {subscription.commissionTypeSnapshot === "PERCENTAGE" ? "%" : ""} commission
            </p>
          )}
          {subscription.status === "ACTIVE" && (
            <Button variant="danger" onClick={handleCancel} className="mt-4">
              Cancel subscription
            </Button>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {subscription?.status === "ACTIVE" ? "Change plan" : "Available plans"}
        </h2>
        {loadingPlans ? (
          <p className="text-slate-500">Loading plans…</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {plans?.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ₹{plan.price}
                  <span className="text-sm font-normal text-slate-500">/{plan.billingInterval === "MONTHLY" ? "mo" : "yr"}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {plan.commissionValue}
                  {plan.commissionType === "PERCENTAGE" ? "%" : ""} commission per order
                </p>
                <Button
                  className="mt-4"
                  variant={subscription?.planId === plan.id ? "secondary" : "primary"}
                  disabled={subscription?.planId === plan.id}
                  loading={busyPlanId === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {subscription?.planId === plan.id ? "Current plan" : "Subscribe"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
