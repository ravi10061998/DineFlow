"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Banner } from "@/lib/home-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Modal } from "@/components/ui/modal";
import { StoreImage } from "@/components/home/store-image";

/** The admin list/detail shape includes isActive/sortOrder — the public storefront type
 * (`@/lib/home-types`'s Banner) deliberately omits both, since customers only ever see
 * already-filtered, already-ordered results. */
interface AdminBanner extends Banner {
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

interface BannerFormState {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
}

const emptyForm: BannerFormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  startDate: "",
  endDate: "",
  sortOrder: "",
};

export default function AdminBannersPage() {
  const { data: banners, loading, error, reload } = useApiQuery(() => api.get<AdminBanner[]>("/admin/banners"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditingBanner(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(banner: AdminBanner) {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl,
      ctaLabel: banner.ctaLabel ?? "",
      ctaUrl: banner.ctaUrl ?? "",
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : "",
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : "",
      sortOrder: String(banner.sortOrder),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      imageUrl: form.imageUrl,
      ctaLabel: form.ctaLabel || undefined,
      ctaUrl: form.ctaUrl || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    };
    try {
      if (editingBanner) {
        await api.patch(`/admin/banners/${editingBanner.id}`, payload);
      } else {
        await api.post("/admin/banners", payload);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(banner: AdminBanner) {
    setActionError(null);
    try {
      await api.patch(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function deleteBanner(banner: AdminBanner) {
    if (!window.confirm(`Delete banner "${banner.title}"? This can't be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/admin/banners/${banner.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Banners</h1>
          <p className="mt-1 text-sm text-slate-500">
            The auto-sliding promo strip at the top of the customer home page. Paste a URL to an already-hosted image (this app doesn&apos;t
            host banner images itself) — an optional schedule window and sort order control when and where each one appears.
          </p>
        </div>
        <Button onClick={openCreate}>Add banner</Button>
      </div>

      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Sort order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No banners yet — the home page carousel stays hidden until at least one is added.
                  </td>
                </tr>
              )}
              {banners?.map((banner) => (
                <tr key={banner.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <StoreImage src={banner.imageUrl} alt={banner.title} className="h-12 w-20 rounded-md object-cover" />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {banner.title}
                    {banner.subtitle && <span className="block text-xs font-normal text-slate-400">{banner.subtitle}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {banner.startDate || banner.endDate ? (
                      <>
                        {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : "Always"} –{" "}
                        {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : "Always"}
                      </>
                    ) : (
                      "Always"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{banner.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={banner.isActive ? "text-green-700" : "text-slate-400"}>{banner.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openEdit(banner)}>
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => toggleActive(banner)}>
                        {banner.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="danger" onClick={() => deleteBanner(banner)}>
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
        <Modal title={editingBanner ? `Edit ${editingBanner.title}` : "New banner"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorBanner message={formError} />
            <TextField label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField
              label="Subtitle (optional)"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
            <TextField
              label="Image URL"
              required
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            {form.imageUrl && <StoreImage src={form.imageUrl} alt="Preview" className="h-24 w-full rounded-md object-cover" />}
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="CTA label (optional)"
                placeholder="Order now"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
              />
              <TextField
                label="CTA link (optional)"
                placeholder="/restaurants/abc-123"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Start date (optional)"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <TextField
                label="End date (optional)"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <TextField
              label="Sort order (optional — lower shows first)"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingBanner ? "Save changes" : "Add banner"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
