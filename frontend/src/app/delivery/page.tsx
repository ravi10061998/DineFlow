"use client";

import { useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import { locationStore } from "@/lib/location-store";
import type { DeliveryPartner } from "@/lib/delivery-partner-types";
import type { DeliveryAssignment } from "@/lib/delivery-assignment-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PortalHero } from "@/components/ui/portal-hero";
import { AssignmentCard } from "./assignment-card";
import { EarningsSection } from "./earnings-section";

const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "PICKED_UP"];

function DeliveryDashboardContent() {
  const { user, logout } = useAuth();
  const { data: partner, loading, error, reload } = useApiQuery(() => api.get<DeliveryPartner>("/delivery-partner/me"));
  const {
    data: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    reload: reloadAssignments,
  } = useApiQuery(() => api.get<DeliveryAssignment[]>("/delivery-partner/me/assignments"));
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSaved, setLocationSaved] = useState(false);

  async function toggleOnline() {
    if (!partner) return;
    setToggleError(null);
    setToggling(true);
    try {
      await api.patch("/delivery-partner/me/online", { isOnline: !partner.isOnline });
      reload();
    } catch (err) {
      setToggleError(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  async function shareLocation() {
    setLocationError(null);
    setLocationSaved(false);
    setLocating(true);
    try {
      const { lat, lng } = await locationStore.requestBrowserLocation();
      await api.patch("/delivery-partner/me/location", { latitude: lat, longitude: lng });
      setLocationSaved(true);
      reload();
    } catch (err) {
      setLocationError(getErrorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <button onClick={() => logout()} className="text-sm text-slate-500 hover:text-slate-700">
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
        <PortalHero
          title={`Welcome, ${user?.fullName}`}
          subtitle={partner ? <StatusBadge status={partner.status} /> : undefined}
        />

        <ErrorBanner message={error} />

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : partner ? (
          <>
            {partner.status === "PENDING" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your account is awaiting admin approval. You&apos;ll be able to go online for deliveries once approved.
              </div>
            )}
            {partner.status === "REJECTED" && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Your registration was rejected{partner.rejectionReason ? `: ${partner.rejectionReason}` : "."}
              </div>
            )}
            {partner.status === "SUSPENDED" && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                Your account is suspended{partner.rejectionReason ? `: ${partner.rejectionReason}` : "."}
              </div>
            )}
            {partner.status === "BLOCKED" && (
              <div className="rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Your account has been blocked. Contact support if you believe this is a mistake.
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-medium text-slate-500">Availability</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{partner.isOnline ? "Online — accepting deliveries" : "Offline"}</p>
              </div>
              <Button
                variant={partner.isOnline ? "danger" : "primary"}
                loading={toggling}
                disabled={partner.status !== "APPROVED" && !partner.isOnline}
                onClick={toggleOnline}
              >
                {partner.isOnline ? "Go offline" : "Go online"}
              </Button>
            </div>
            <ErrorBanner message={toggleError} />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Live location</p>
              <p className="mt-1 text-sm text-slate-600">
                {partner.currentLatitude && partner.currentLongitude
                  ? `Last shared: ${partner.currentLatitude}, ${partner.currentLongitude}`
                  : "Not shared yet."}
              </p>
              <Button variant="secondary" loading={locating} onClick={shareLocation} className="mt-3">
                Share current location
              </Button>
              {locationSaved && <p className="mt-2 text-sm text-green-700">Location updated.</p>}
              <ErrorBanner message={locationError} />
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6 text-sm shadow-sm">
              <div>
                <dt className="text-slate-500">Vehicle</dt>
                <dd className="text-slate-900">
                  {partner.vehicleType} · {partner.vehicleNumber}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">License number</dt>
                <dd className="text-slate-900">{partner.licenseNumber}</dd>
              </div>
            </dl>

            <div>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Active deliveries</h2>
              <ErrorBanner message={assignmentsError} />
              {assignmentsLoading ? (
                <p className="text-slate-500">Loading…</p>
              ) : (
                (() => {
                  const active = assignments?.filter((a) => ACTIVE_STATUSES.includes(a.status)) ?? [];
                  return active.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      No active deliveries right now — go online to start receiving them.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {active.map((a) => (
                        <AssignmentCard key={a.id} assignment={a} onChanged={reloadAssignments} />
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

            <EarningsSection />
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function DeliveryDashboardPage() {
  return (
    <RequireAuth roles={["DELIVERY_PARTNER"]}>
      <DeliveryDashboardContent />
    </RequireAuth>
  );
}
