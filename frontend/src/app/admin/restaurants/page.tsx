"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Restaurant, RestaurantStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { CommissionModal } from "./commission-modal";

const STATUS_FILTERS: (RestaurantStatus | "ALL")[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "BLOCKED"];

export default function AdminRestaurantsPage() {
  const [filter, setFilter] = useState<RestaurantStatus | "ALL">("PENDING");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commissionRestaurantId, setCommissionRestaurantId] = useState<string | null>(null);

  const { data: restaurants, loading, error, reload } = useApiQuery(
    () => api.get<Restaurant[]>(`/admin/restaurants${filter === "ALL" ? "" : `?status=${filter}`}`),
    [filter],
  );

  async function runAction(id: string, action: "approve" | "reject" | "suspend" | "block" | "reinstate" | "resubmit") {
    setActionError(null);
    let reason: string | undefined;
    if (action === "reject" || action === "suspend" || action === "block") {
      reason = window.prompt(`Reason for ${action}?`) ?? undefined;
      if (!reason) return;
    }
    setBusyId(id);
    try {
      await api.patch(`/admin/restaurants/${id}/${action}`, reason ? { reason } : undefined);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const actionsFor = (status: RestaurantStatus): { label: string; action: Parameters<typeof runAction>[1] }[] => {
    switch (status) {
      case "PENDING":
        return [
          { label: "Approve", action: "approve" },
          { label: "Reject", action: "reject" },
        ];
      case "APPROVED":
        return [
          { label: "Suspend", action: "suspend" },
          { label: "Block", action: "block" },
        ];
      case "SUSPENDED":
        return [
          { label: "Reinstate", action: "reinstate" },
          { label: "Block", action: "block" },
        ];
      case "REJECTED":
        return [{ label: "Reconsider (→ Pending)", action: "resubmit" }];
      default:
        return [];
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Restaurants</h1>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm ${filter === s ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <ErrorBanner message={error ?? actionError} />
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No restaurants in this status.
                  </td>
                </tr>
              )}
              {restaurants?.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.ownerFullName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.city}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <p className="mt-1 max-w-xs text-xs text-slate-400">{r.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {actionsFor(r.status).map(({ label, action }) => (
                        <Button
                          key={action}
                          variant={action === "block" || action === "reject" ? "danger" : "secondary"}
                          disabled={busyId === r.id}
                          onClick={() => runAction(r.id, action)}
                        >
                          {label}
                        </Button>
                      ))}
                      {(r.status === "APPROVED" || r.status === "SUSPENDED") && (
                        <Button variant="secondary" onClick={() => setCommissionRestaurantId(r.id)}>
                          Commission
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {commissionRestaurantId && (
        <CommissionModal restaurantId={commissionRestaurantId} onClose={() => setCommissionRestaurantId(null)} />
      )}
    </div>
  );
}
