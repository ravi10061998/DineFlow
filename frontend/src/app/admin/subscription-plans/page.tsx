"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { BillingInterval, CommissionType, SubscriptionPlan, TrialSettings } from "@/lib/subscription-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Modal } from "@/components/ui/modal";

const BILLING_INTERVALS: BillingInterval[] = ["MONTHLY", "YEARLY", "CUSTOM"];
const COMMISSION_TYPES: CommissionType[] = ["PERCENTAGE", "FIXED"];

interface PlanFormState {
  name: string;
  description: string;
  billingInterval: BillingInterval;
  price: string;
  commissionType: CommissionType;
  commissionValue: string;
}

const emptyForm: PlanFormState = {
  name: "",
  description: "",
  billingInterval: "MONTHLY",
  price: "",
  commissionType: "PERCENTAGE",
  commissionValue: "",
};

function TrialSettingsCard() {
  const { data: settings, loading, error, setData } = useApiQuery(() => api.get<TrialSettings>("/admin/trial-settings"));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return <p className="text-slate-500">Loading trial settings…</p>;
  if (error || !settings) return <ErrorBanner message={error ?? "Failed to load trial settings"} />;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<TrialSettings>("/admin/trial-settings", {
        isEnabled: form.get("isEnabled") === "on",
        trialDurationDays: Number(form.get("trialDurationDays")),
        reminderScheduleDays: String(form.get("reminderScheduleDays"))
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n)),
      });
      setData(updated);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Free Trial Settings</h2>
      <ErrorBanner message={saveError} />
      <div className="mt-4 flex items-center gap-2">
        <input type="checkbox" id="isEnabled" name="isEnabled" defaultChecked={settings.isEnabled} className="h-4 w-4" />
        <label htmlFor="isEnabled" className="text-sm text-slate-700">
          Trials enabled for new restaurant approvals
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <TextField
          label="Trial duration (days)"
          name="trialDurationDays"
          type="number"
          min={1}
          defaultValue={settings.trialDurationDays}
        />
        <TextField
          label="Reminder days (comma-separated)"
          name="reminderScheduleDays"
          defaultValue={settings.reminderScheduleDays.join(", ")}
        />
      </div>
      <Button type="submit" loading={saving} className="mt-4">
        Save trial settings
      </Button>
    </form>
  );
}

export default function AdminSubscriptionPlansPage() {
  const { data: plans, loading, error, reload } = useApiQuery(() =>
    api.get<SubscriptionPlan[]>("/admin/subscription-plans?includeInactive=true"),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      billingInterval: plan.billingInterval,
      price: plan.price,
      commissionType: plan.commissionType,
      commissionValue: plan.commissionValue,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      billingInterval: form.billingInterval,
      price: Number(form.price),
      commissionType: form.commissionType,
      commissionValue: Number(form.commissionValue),
    };
    try {
      if (editingPlan) {
        await api.patch(`/admin/subscription-plans/${editingPlan.id}`, payload);
      } else {
        await api.post("/admin/subscription-plans", payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    setActionError(null);
    try {
      await api.patch(`/admin/subscription-plans/${plan.id}`, { isActive: !plan.isActive });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function deletePlan(plan: SubscriptionPlan) {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/admin/subscription-plans/${plan.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Subscription Plans</h1>
        <Button onClick={openCreate}>Add plan</Button>
      </div>

      <TrialSettingsCard />

      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan) => (
                <tr key={plan.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{plan.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    ₹{plan.price}/{plan.billingInterval === "MONTHLY" ? "mo" : plan.billingInterval === "YEARLY" ? "yr" : "custom"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {plan.commissionValue}
                    {plan.commissionType === "PERCENTAGE" ? "%" : " (fixed)"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={plan.isActive ? "text-green-700" : "text-slate-400"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEdit(plan)}>
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => toggleActive(plan)}>
                        {plan.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="danger" onClick={() => deletePlan(plan)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingPlan ? `Edit ${editingPlan.name}` : "New plan"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorBanner message={formError} />
            <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Billing interval</label>
                <select
                  value={form.billingInterval}
                  onChange={(e) => setForm({ ...form, billingInterval: e.target.value as BillingInterval })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {BILLING_INTERVALS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label="Price"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Commission type</label>
                <select
                  value={form.commissionType}
                  onChange={(e) => setForm({ ...form, commissionType: e.target.value as CommissionType })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {COMMISSION_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label={form.commissionType === "PERCENTAGE" ? "Commission (%)" : "Commission (fixed amount)"}
                type="number"
                min={0}
                step="0.01"
                required
                value={form.commissionValue}
                onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingPlan ? "Save changes" : "Create plan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
