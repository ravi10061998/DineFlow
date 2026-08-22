"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { DeliveryAssignment } from "@/lib/delivery-assignment-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

export function AssignmentCard({ assignment, onChanged }: { assignment: DeliveryAssignment; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  async function act(action: "accept" | "reject" | "picked-up") {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/delivery-partner/me/assignments/${assignment.id}/${action}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deliver() {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/delivery-partner/me/assignments/${assignment.id}/deliver`, { otp });
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-900">{assignment.order?.orderNumber ?? "Order"}</p>
        <StatusBadge status={assignment.status} />
      </div>

      <ErrorBanner message={error} />

      {assignment.status === "ASSIGNED" && (
        <div className="mt-3 flex gap-2">
          <Button loading={busy} onClick={() => act("accept")}>
            Accept
          </Button>
          <Button variant="danger" loading={busy} onClick={() => act("reject")}>
            Reject
          </Button>
        </div>
      )}

      {assignment.status === "ACCEPTED" && (
        <Button className="mt-3" loading={busy} onClick={() => act("picked-up")}>
          Mark picked up from restaurant
        </Button>
      )}

      {assignment.status === "PICKED_UP" && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">Enter the customer&apos;s delivery code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm tracking-widest outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              placeholder="000000"
            />
          </div>
          <Button loading={busy} disabled={otp.length !== 6} onClick={deliver}>
            Confirm delivery
          </Button>
        </div>
      )}
    </div>
  );
}
