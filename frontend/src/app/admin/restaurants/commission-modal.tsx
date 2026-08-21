"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { CommissionCalculation, CommissionRule, EffectiveCommission } from "@/lib/commission-types";
import type { CommissionType } from "@/lib/subscription-types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";

export function CommissionModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const {
    data: effective,
    loading: loadingEffective,
    error: effectiveError,
    reload: reloadEffective,
  } = useApiQuery(() => api.get<EffectiveCommission>(`/admin/restaurants/${restaurantId}/commission`), [restaurantId]);
  const {
    data: rules,
    loading: loadingRules,
    reload: reloadRules,
  } = useApiQuery(() => api.get<CommissionRule[]>(`/admin/commission-rules?restaurantId=${restaurantId}`), [restaurantId]);

  const [previewAmount, setPreviewAmount] = useState("1000");
  const [preview, setPreview] = useState<CommissionCalculation | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [commissionType, setCommissionType] = useState<CommissionType>("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function runPreview() {
    setPreviewError(null);
    try {
      const result = await api.post<CommissionCalculation>(`/admin/restaurants/${restaurantId}/commission/preview`, {
        amount: Number(previewAmount),
      });
      setPreview(result);
    } catch (err) {
      setPreviewError(getErrorMessage(err));
    }
  }

  async function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/admin/commission-rules", {
        restaurantId,
        commissionType,
        commissionValue: Number(commissionValue),
        reason,
      });
      setShowForm(false);
      setCommissionValue("");
      setReason("");
      reloadEffective();
      reloadRules();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Commission" onClose={onClose}>
      <div className="space-y-6">
        <ErrorBanner message={effectiveError} />

        <div>
          <h3 className="text-sm font-medium text-slate-500">Effective rate</h3>
          {loadingEffective ? (
            <p className="mt-1 text-slate-500">Loading…</p>
          ) : effective ? (
            <p className="mt-1 text-xl font-bold text-slate-900">
              {effective.commissionValue}
              {effective.commissionType === "PERCENTAGE" ? "%" : " (fixed)"}{" "}
              <span className="text-sm font-normal text-slate-500">— source: {effective.source}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700">Preview a split</h3>
          <div className="mt-2 flex items-end gap-2">
            <TextField label="Order amount" type="number" min={0.01} step="0.01" value={previewAmount} onChange={(e) => setPreviewAmount(e.target.value)} />
            <Button type="button" variant="secondary" onClick={runPreview}>
              Calculate
            </Button>
          </div>
          <ErrorBanner message={previewError} />
          {preview && (
            <p className="mt-2 text-sm text-slate-600">
              Platform: <span className="font-medium text-slate-900">₹{preview.platformAmount}</span> · Restaurant:{" "}
              <span className="font-medium text-slate-900">₹{preview.restaurantAmount}</span>
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Rule history</h3>
            <Button type="button" variant="secondary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancel" : "New override"}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateRule} className="mt-3 space-y-3 rounded-md border border-slate-200 p-4">
              <ErrorBanner message={formError} />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as CommissionType)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    <option value="FIXED">FIXED</option>
                  </select>
                </div>
                <TextField
                  label="Value"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                />
              </div>
              <TextField label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button type="submit" loading={saving}>
                Create override
              </Button>
            </form>
          )}

          {loadingRules ? (
            <p className="mt-3 text-slate-500">Loading…</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {rules?.length === 0 && <li className="text-slate-400">No overrides yet — using the plan/trial rate.</li>}
              {rules?.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                  <span>
                    {rule.commissionValue}
                    {rule.commissionType === "PERCENTAGE" ? "%" : " fixed"} — {rule.reason}
                  </span>
                  <span className={rule.isActive ? "text-green-700" : "text-slate-400"}>
                    {rule.isActive ? "Active" : "Superseded"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
