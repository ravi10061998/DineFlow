"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorBanner } from "@/components/ui/error-banner";

interface BankAccount {
  accountHolderName: string;
  maskedAccountNumber: string;
  ifscCode: string;
  bankName: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason: string | null;
}

export function BankAccountModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const {
    data: account,
    loading,
    error,
    reload,
  } = useApiQuery(() => api.get<BankAccount | null>(`/admin/restaurants/${restaurantId}/bank-account`), [restaurantId]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function verify() {
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/admin/restaurants/${restaurantId}/bank-account/verify`, {});
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const reason = window.prompt("Reason for rejecting this bank account?");
    if (!reason) return;
    setActionError(null);
    setBusy(true);
    try {
      await api.patch(`/admin/restaurants/${restaurantId}/bank-account/reject`, { reason });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Bank Account" onClose={onClose}>
      <div className="space-y-4">
        <ErrorBanner message={error ?? actionError} />

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : !account ? (
          <p className="text-slate-400">This restaurant hasn&apos;t submitted a bank account yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Status</h3>
              <StatusBadge status={account.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Account holder</dt>
              <dd className="text-slate-900">{account.accountHolderName}</dd>
              <dt className="text-slate-500">Account number</dt>
              <dd className="font-mono text-slate-900">{account.maskedAccountNumber}</dd>
              <dt className="text-slate-500">IFSC</dt>
              <dd className="text-slate-900">{account.ifscCode}</dd>
              {account.bankName && (
                <>
                  <dt className="text-slate-500">Bank</dt>
                  <dd className="text-slate-900">{account.bankName}</dd>
                </>
              )}
            </dl>
            {account.status === "REJECTED" && account.rejectionReason && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Rejected: {account.rejectionReason}
              </div>
            )}
            {account.status !== "VERIFIED" && (
              <div className="flex gap-2">
                <Button loading={busy} onClick={verify}>
                  Verify
                </Button>
                <Button variant="danger" disabled={busy} onClick={reject}>
                  Reject
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
