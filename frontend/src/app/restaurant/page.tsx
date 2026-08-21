"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Restaurant } from "@/lib/types";
import type { EffectiveCommission } from "@/lib/commission-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

const SOURCE_LABEL: Record<EffectiveCommission["source"], string> = {
  RESTAURANT_OVERRIDE: "Negotiated rate",
  PLAN: "Your plan",
  TRIAL: "Free trial",
};

function CommissionCard() {
  const { data: commission, loading, error } = useApiQuery(() => api.get<EffectiveCommission>("/restaurant/me/commission"));

  if (loading) return null;
  if (error) return <ErrorBanner message={error} />;
  if (!commission) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-500">Current commission rate</h2>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {commission.commissionValue}
        {commission.commissionType === "PERCENTAGE" ? "%" : " (fixed per order)"}
      </p>
      <p className="mt-1 text-sm text-slate-500">{SOURCE_LABEL[commission.source]}</p>
    </div>
  );
}

export default function RestaurantDashboardPage() {
  const { data: restaurant, loading, error } = useApiQuery(() => api.get<Restaurant>("/restaurant/me"));

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!restaurant) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{restaurant.name}</h1>
          <StatusBadge status={restaurant.status} />
        </div>
        <p className="mt-1 text-slate-500">/{restaurant.slug}</p>
      </div>

      {restaurant.status === "PENDING" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your restaurant is awaiting admin approval. You can still update your profile and upload documents in
          the meantime.
        </div>
      )}
      {restaurant.status === "REJECTED" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your registration was rejected{restaurant.rejectionReason ? `: ${restaurant.rejectionReason}` : "."}
        </div>
      )}
      {restaurant.status === "SUSPENDED" && (
        <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Your restaurant is suspended{restaurant.rejectionReason ? `: ${restaurant.rejectionReason}` : "."}
        </div>
      )}

      {/* Only restaurants that have been approved at least once have a subscription/commission to show. */}
      {(restaurant.status === "APPROVED" || restaurant.status === "SUSPENDED") && <CommissionCard />}

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <div>
          <dt className="text-slate-500">Owner</dt>
          <dd className="text-slate-900">{restaurant.ownerFullName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Contact</dt>
          <dd className="text-slate-900">
            {restaurant.email} · {restaurant.phone}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Address</dt>
          <dd className="text-slate-900">
            {restaurant.addressLine1}
            {restaurant.addressLine2 ? `, ${restaurant.addressLine2}` : ""}, {restaurant.city}, {restaurant.state}{" "}
            {restaurant.postalCode}, {restaurant.country}
          </dd>
        </div>
      </dl>
    </div>
  );
}
