"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { DeliveryPartnerFeeSettings } from "@/lib/delivery-partner-ledger-types";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminDeliveryPartnerFeePage() {
  const { data: settings, loading, error, reload } = useApiQuery(() => api.get<DeliveryPartnerFeeSettings>("/admin/delivery-partner-fee-settings"));
  const [perDeliveryRate, setPerDeliveryRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setPerDeliveryRate(settings.perDeliveryRate);
  }, [settings]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch("/admin/delivery-partner-fee-settings", { perDeliveryRate: Number(perDeliveryRate) });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Delivery Partner Pay Rate</h1>
      <p className="mt-1 text-sm text-slate-500">A flat amount credited to a delivery partner&apos;s ledger for every completed delivery.</p>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <TextField
            label="Per-delivery rate (₹)"
            type="number"
            step="0.01"
            min={0}
            value={perDeliveryRate}
            onChange={(e) => setPerDeliveryRate(e.target.value)}
          />
          <ErrorBanner message={saveError} />
          {saved && !saveError && <p className="text-sm text-green-700">Saved.</p>}
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      )}
    </div>
  );
}
