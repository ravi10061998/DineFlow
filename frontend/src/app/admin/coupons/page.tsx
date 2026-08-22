"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Coupon, CouponDiscountType, CouponRedemption } from "@/lib/coupon-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Modal } from "@/components/ui/modal";

const DISCOUNT_TYPES: CouponDiscountType[] = ["PERCENTAGE", "FIXED"];

interface CouponFormState {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  restaurantId: string;
  perCustomerLimit: string;
  totalRedemptionLimit: string;
  expiresAt: string;
}

const emptyForm: CouponFormState = {
  code: "",
  description: "",
  discountType: "FIXED",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  restaurantId: "",
  perCustomerLimit: "1",
  totalRedemptionLimit: "",
  expiresAt: "",
};

function RedemptionsModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const { data: redemptions, loading, error } = useApiQuery(() => api.get<CouponRedemption[]>(`/admin/coupons/${coupon.id}/redemptions`));

  return (
    <Modal title={`Redemptions — ${coupon.code}`} onClose={onClose}>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : redemptions?.length === 0 ? (
        <p className="text-slate-400">This coupon hasn&apos;t been redeemed yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {redemptions?.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{r.customer?.fullName ?? r.customerId}</span>
                <span className="font-semibold text-green-700">-₹{r.discountAmount}</span>
              </div>
              <p className="text-xs text-slate-500">
                Order {r.order?.orderNumber ?? r.orderId} · {new Date(r.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function AdminCouponsPage() {
  const { data: coupons, loading, error, reload } = useApiQuery(() => api.get<Coupon[]>("/admin/coupons"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingRedemptionsFor, setViewingRedemptionsFor] = useState<Coupon | null>(null);

  function openCreate() {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount ?? "",
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      restaurantId: coupon.restaurantId ?? "",
      perCustomerLimit: String(coupon.perCustomerLimit),
      totalRedemptionLimit: coupon.totalRedemptionLimit !== null ? String(coupon.totalRedemptionLimit) : "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      restaurantId: form.restaurantId || undefined,
      perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : undefined,
      totalRedemptionLimit: form.totalRedemptionLimit ? Number(form.totalRedemptionLimit) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    };
    try {
      if (editingCoupon) {
        await api.patch(`/admin/coupons/${editingCoupon.id}`, payload);
      } else {
        await api.post("/admin/coupons", payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setActionError(null);
    try {
      await api.patch(`/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This is only possible if it has never been redeemed.`)) return;
    setActionError(null);
    try {
      await api.delete(`/admin/coupons/${coupon.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real, redeemable discount codes validated at checkout — distinct from the homepage&apos;s display-only Offers.
          </p>
        </div>
        <Button onClick={openCreate}>Create coupon</Button>
      </div>

      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Limits</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No coupons yet.
                  </td>
                </tr>
              )}
              {coupons?.map((coupon) => (
                <tr key={coupon.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{coupon.code}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {coupon.discountValue}
                    {coupon.discountType === "PERCENTAGE" ? "%" : " (fixed)"}
                    {coupon.minOrderAmount && <span className="block text-xs text-slate-400">min ₹{coupon.minOrderAmount}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{coupon.restaurantId ? "One restaurant" : "Platform-wide"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {coupon.perCustomerLimit}/customer
                    {coupon.totalRedemptionLimit && <span className="block text-xs text-slate-400">{coupon.totalRedemptionLimit} total</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <span className={coupon.isActive ? "text-green-700" : "text-slate-400"}>{coupon.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setViewingRedemptionsFor(coupon)}>
                        Redemptions
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(coupon)}>
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => toggleActive(coupon)}>
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="danger" onClick={() => deleteCoupon(coupon)}>
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
        <Modal title={editingCoupon ? `Edit ${editingCoupon.code}` : "New coupon"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorBanner message={formError} />
            <TextField label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Discount type</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as CouponDiscountType })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <TextField
                label={form.discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                type="number"
                min={0}
                step="0.01"
                required
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Min order amount (optional)"
                type="number"
                min={0}
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              />
              {form.discountType === "PERCENTAGE" && (
                <TextField
                  label="Max discount cap (optional)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Per-customer limit"
                type="number"
                min={1}
                value={form.perCustomerLimit}
                onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })}
              />
              <TextField
                label="Total redemption limit (optional)"
                type="number"
                min={1}
                value={form.totalRedemptionLimit}
                onChange={(e) => setForm({ ...form, totalRedemptionLimit: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Restaurant ID (optional — blank = platform-wide)"
                value={form.restaurantId}
                onChange={(e) => setForm({ ...form, restaurantId: e.target.value })}
              />
              <TextField
                label="Expires on (optional)"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingCoupon ? "Save changes" : "Create coupon"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {viewingRedemptionsFor && <RedemptionsModal coupon={viewingRedemptionsFor} onClose={() => setViewingRedemptionsFor(null)} />}
    </div>
  );
}
