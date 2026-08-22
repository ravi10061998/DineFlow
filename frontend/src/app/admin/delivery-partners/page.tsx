"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { DeliveryPartner, DeliveryPartnerStatus } from "@/lib/delivery-partner-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

const STATUS_FILTERS: (DeliveryPartnerStatus | "ALL")[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "BLOCKED"];

type Action = "approve" | "reject" | "suspend" | "block" | "reinstate" | "resubmit";

export default function AdminDeliveryPartnersPage() {
  const [filter, setFilter] = useState<DeliveryPartnerStatus | "ALL">("PENDING");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);

  const { data: partners, loading, error, reload } = useApiQuery(
    () => api.get<DeliveryPartner[]>(`/admin/delivery-partners${filter === "ALL" ? "" : `?status=${filter}`}`),
    [filter],
  );

  async function runPayout(id: string) {
    setActionError(null);
    setPayoutMessage(null);
    setBusyId(id);
    try {
      const payout = await api.post<{ amount: string } | null>(`/admin/delivery-partners/${id}/payouts/run`);
      setPayoutMessage(payout ? `Payout created for ₹${payout.amount}.` : "Nothing to pay out — no unpaid balance.");
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(id: string, action: Action) {
    setActionError(null);
    let reason: string | undefined;
    if (action === "reject" || action === "suspend" || action === "block") {
      reason = window.prompt(`Reason for ${action}?`) ?? undefined;
      if (!reason) return;
    }
    setBusyId(id);
    try {
      await api.patch(`/admin/delivery-partners/${id}/${action}`, reason ? { reason } : undefined);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const actionsFor = (status: DeliveryPartnerStatus): { label: string; action: Action }[] => {
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
      <h1 className="text-2xl font-semibold text-slate-900">Delivery Partners</h1>

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
        {payoutMessage && <p className="text-sm text-green-700">{payoutMessage}</p>}
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No delivery partners in this status.
                  </td>
                </tr>
              )}
              {partners?.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.user?.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.user?.email}
                    {p.user?.phone && <span className="block text-xs text-slate-400">{p.user.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.vehicleType} · {p.vehicleNumber}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                    {p.status === "REJECTED" && p.rejectionReason && (
                      <p className="mt-1 max-w-xs text-xs text-slate-400">{p.rejectionReason}</p>
                    )}
                    {p.isOnline && <span className="ml-1 text-xs font-medium text-green-600">● Online</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {actionsFor(p.status).map(({ label, action }) => (
                        <Button
                          key={action}
                          variant={action === "block" || action === "reject" ? "danger" : "secondary"}
                          disabled={busyId === p.id}
                          onClick={() => runAction(p.id, action)}
                        >
                          {label}
                        </Button>
                      ))}
                      {p.status === "APPROVED" && (
                        <Button variant="secondary" loading={busyId === p.id} onClick={() => runPayout(p.id)}>
                          Run payout
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
    </div>
  );
}
