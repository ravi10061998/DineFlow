"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { DeliveryFeeSettings } from "@/lib/delivery-fee-types";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function AdminDeliveryFeePage() {
  const { data: settings, loading, error, reload } = useApiQuery(() => api.get<DeliveryFeeSettings>("/admin/delivery-fee-settings"));
  const [baseFee, setBaseFee] = useState("");
  const [perKmRate, setPerKmRate] = useState("");
  const [freeAbove, setFreeAbove] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setBaseFee(settings.baseFee);
    setPerKmRate(settings.perKmRate);
    setFreeAbove(settings.freeDeliveryAboveAmount ?? "");
  }, [settings]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch("/admin/delivery-fee-settings", {
        baseFee: Number(baseFee),
        perKmRate: Number(perKmRate),
        freeDeliveryAboveAmount: freeAbove === "" ? null : Number(freeAbove),
      });
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
      <h1 className="text-2xl font-semibold text-slate-900">Delivery Fee Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Applied at checkout: base fee + per-km rate × distance when both the restaurant and delivery address have
        coordinates, otherwise a flat base fee.
      </p>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <TextField label="Base fee (₹)" type="number" step="0.01" min={0} value={baseFee} onChange={(e) => setBaseFee(e.target.value)} />
          <TextField label="Per-km rate (₹)" type="number" step="0.01" min={0} value={perKmRate} onChange={(e) => setPerKmRate(e.target.value)} />
          <TextField
            label="Free delivery above order value (₹) — leave blank to disable"
            type="number"
            step="0.01"
            min={0}
            value={freeAbove}
            onChange={(e) => setFreeAbove(e.target.value)}
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
