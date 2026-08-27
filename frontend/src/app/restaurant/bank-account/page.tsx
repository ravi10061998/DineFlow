"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { StatusBadge } from "@/components/ui/status-badge";

interface BankAccount {
  id: string;
  accountHolderName: string;
  maskedAccountNumber: string;
  ifscCode: string;
  bankName: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason: string | null;
}

export default function RestaurantBankAccountPage() {
  const { data: account, loading, error, reload } = useApiQuery(() => api.get<BankAccount | null>("/restaurant/me/bank-account"));

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Only ever pre-fills the holder name/bank name/IFSC (never the real account number -- the API
  // never sends that back, only a masked version, by design). Re-entering the number on any edit
  // is a deliberate friction, not an oversight: it's the one field a typo in would silently send
  // real money to the wrong account.
  useEffect(() => {
    if (!account) return;
    setAccountHolderName(account.accountHolderName);
    setIfscCode(account.ifscCode);
    setBankName(account.bankName ?? "");
  }, [account]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.put("/restaurant/me/bank-account", {
        accountHolderName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        bankName: bankName || undefined,
      });
      setAccountNumber(""); // never keep the raw number in memory/the input longer than the one request that needed it
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bank Account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Where your weekly settlement payouts are sent. An admin reviews every new or changed account before
          any payout can go to it.
        </p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          {account && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Current account on file</h2>
                <StatusBadge status={account.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Rejected: {account.rejectionReason}
                </div>
              )}
              {account.status === "PENDING" && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Awaiting admin verification — payouts can&apos;t be sent until this is verified.
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">{account ? "Replace bank account" : "Add bank account"}</h2>
            {account && (
              <p className="text-xs text-slate-400">
                Submitting this resets verification to pending — a rebind always needs a fresh admin review.
              </p>
            )}
            <TextField
              label="Account holder name"
              required
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
            <TextField
              label="Account number"
              required
              placeholder={account ? "Re-enter to change" : undefined}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            />
            <TextField
              label="IFSC code"
              required
              placeholder="HDFC0001234"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            />
            <TextField label="Bank name (optional)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <ErrorBanner message={saveError} />
            {saved && !saveError && <p className="text-sm text-green-700">Saved — pending admin verification.</p>}
            <Button type="submit" loading={saving}>
              {account ? "Save & resubmit for verification" : "Save bank account"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
