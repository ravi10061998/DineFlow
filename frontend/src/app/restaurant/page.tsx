"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Restaurant } from "@/lib/types";
import type { EffectiveCommission } from "@/lib/commission-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PortalHero } from "@/components/ui/portal-hero";
import { RestaurantLogoUpload } from "@/components/restaurant-logo-upload";

const QUICK_ACTIONS = [
  { href: "/restaurant/categories", icon: "🗂️", label: "Menu Categories", description: "Organize your menu into sections" },
  { href: "/restaurant/products", icon: "🍽️", label: "Products", description: "Add dishes, variants & add-ons" },
  { href: "/restaurant/orders", icon: "🧾", label: "Orders", description: "Fulfill incoming orders" },
  { href: "/restaurant/ledger", icon: "💰", label: "Ledger", description: "Track your running balance" },
  { href: "/restaurant/subscription", icon: "⭐", label: "Subscription", description: "Manage your plan" },
] as const;

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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
  const { user } = useAuth();
  const { data: restaurant, loading, error, reload } = useApiQuery(() => api.get<Restaurant>("/restaurant/me"));
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!restaurant) return null;

  async function handleUploadLogo(file: File) {
    setLogoError(null);
    setLogoBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload("/restaurant/me/logo", formData);
      reload();
    } catch (err) {
      setLogoError(getErrorMessage(err));
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoError(null);
    setLogoBusy(true);
    try {
      await api.delete("/restaurant/me/logo");
      reload();
    } catch (err) {
      setLogoError(getErrorMessage(err));
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PortalHero
        title={`Welcome, ${user?.fullName ?? restaurant.ownerFullName}`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {restaurant.name} <StatusBadge status={restaurant.status} />
          </span>
        }
      />

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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Restaurant photo</h2>
        <RestaurantLogoUpload
          restaurantId={restaurant.id}
          hasLogo={!!restaurant.logoPath}
          version={restaurant.updatedAt}
          onUpload={handleUploadLogo}
          onRemove={handleRemoveLogo}
          busy={logoBusy}
        />
        <ErrorBanner message={logoError} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Quick actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <span className="text-2xl">{action.icon}</span>
              <p className="mt-2 text-sm font-semibold text-slate-900 group-hover:text-orange-700">{action.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Only restaurants that have been approved at least once have a subscription/commission to show. */}
      {(restaurant.status === "APPROVED" || restaurant.status === "SUSPENDED") && <CommissionCard />}

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Restaurant details</h2>
        <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6 text-sm shadow-sm">
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
    </div>
  );
}
