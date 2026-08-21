"use client";

import { useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { Product, ProductAddon, ProductVariant } from "@/lib/product-types";
import type { Category } from "@/lib/category-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ProductImageThumb } from "@/components/product-image-thumb";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProductCard({
  product,
  categories,
  isFirst,
  isLast,
  onMove,
  onChanged,
}: {
  product: Product;
  categories: Category[];
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [basePrice, setBasePrice] = useState(product.basePrice);
  const [categoryId, setCategoryId] = useState(product.categoryId);

  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/restaurant/me/products/${product.id}`, {
        name,
        description: description || undefined,
        basePrice: Number(basePrice),
        categoryId,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/restaurant/me/products/${product.id}`, { isActive: !product.isActive });
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailable() {
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/restaurant/me/products/${product.id}/availability`, { isAvailable: !product.isAvailable });
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    setError(null);
    setBusy(true);
    try {
      await api.delete(`/restaurant/me/products/${product.id}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  async function addVariant(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/restaurant/me/products/${product.id}/variants`, { name: variantName, price: Number(variantPrice) });
      setVariantName("");
      setVariantPrice("");
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeVariant(variant: ProductVariant) {
    if (!window.confirm(`Remove variant "${variant.name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/restaurant/me/products/${product.id}/variants/${variant.id}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addAddon(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/restaurant/me/products/${product.id}/addons`, { name: addonName, price: Number(addonPrice) });
      setAddonName("");
      setAddonPrice("");
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeAddon(addon: ProductAddon) {
    if (!window.confirm(`Remove add-on "${addon.name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/restaurant/me/products/${product.id}/addons/${addon.id}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported file type. Allowed: JPEG, PNG, WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Image is too large. Max size is 5MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(`/restaurant/me/products/${product.id}/images`, formData);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (!window.confirm("Delete this image?")) return;
    setError(null);
    try {
      await api.delete(`/restaurant/me/products/${product.id}/images/${imageId}`);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <div className="mt-1 flex flex-col">
            <button
              aria-label="Move up"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              aria-label="Move down"
              disabled={isLast}
              onClick={() => onMove(1)}
              className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
            >
              ▼
            </button>
          </div>

          {product.images[0] && <ProductImageThumb src={`/restaurant/me/products/${product.id}/images/${product.images[0].id}/file`} alt={product.name} />}

          <div>
            <p className={`font-medium ${product.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>{product.name}</p>
            {product.description && <p className="text-sm text-slate-500">{product.description}</p>}
            <p className="mt-1 text-sm font-semibold text-slate-700">₹{product.basePrice}</p>
            <div className="mt-1 flex gap-2 text-xs">
              <span className={product.isAvailable ? "text-green-700" : "text-red-600"}>
                {product.isAvailable ? "In stock" : "Out of stock"}
              </span>
              {(product.variants.length > 0 || product.addons.length > 0) && (
                <span className="text-slate-400">
                  {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}, {product.addons.length} add-on
                  {product.addons.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "Manage"}
          </Button>
          <Button variant="secondary" loading={busy} onClick={toggleAvailable}>
            {product.isAvailable ? "Mark out of stock" : "Mark in stock"}
          </Button>
          <Button variant="secondary" loading={busy} onClick={toggleActive}>
            {product.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="danger" loading={busy} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {expanded && (
        <div className="mt-4 space-y-5 border-t border-slate-100 pt-4">
          {/* Basic details */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Details</h3>
              {!editing && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
            {editing ? (
              <form onSubmit={saveEdit} className="grid grid-cols-2 gap-3">
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <TextField
                  label="Base price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
                <div className="col-span-2">
                  <TextAreaField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`category-${product.id}`} className="text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    id={`category-${product.id}`}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button type="submit" loading={busy}>
                    Save
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          {/* Images */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Photos</h3>
            <div className="flex flex-wrap gap-2">
              {product.images.map((img) => (
                <ProductImageThumb
                  key={img.id}
                  src={`/restaurant/me/products/${product.id}/images/${img.id}/file`}
                  alt={img.originalFileName}
                  onDelete={() => deleteImage(img.id)}
                />
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add photo"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
            </div>
          </div>

          {/* Variants */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Variants (choose one, e.g. Small/Medium/Large)</h3>
            <ul className="mb-2 space-y-1">
              {product.variants.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-1.5 text-sm">
                  <span>
                    {v.name} — ₹{v.price}
                  </span>
                  <button onClick={() => removeVariant(v)} className="text-red-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
              {product.variants.length === 0 && <li className="text-sm text-slate-400">No variants yet.</li>}
            </ul>
            <form onSubmit={addVariant} className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="Name" placeholder="e.g. Large" value={variantName} onChange={(e) => setVariantName(e.target.value)} required />
              </div>
              <div className="w-32">
                <TextField
                  label="Price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={variantPrice}
                  onChange={(e) => setVariantPrice(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </div>

          {/* Add-ons */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Add-ons (pick any number, e.g. Extra Cheese)</h3>
            <ul className="mb-2 space-y-1">
              {product.addons.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-1.5 text-sm">
                  <span>
                    {a.name} — +₹{a.price}
                  </span>
                  <button onClick={() => removeAddon(a)} className="text-red-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
              {product.addons.length === 0 && <li className="text-sm text-slate-400">No add-ons yet.</li>}
            </ul>
            <form onSubmit={addAddon} className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="Name" placeholder="e.g. Extra Cheese" value={addonName} onChange={(e) => setAddonName(e.target.value)} required />
              </div>
              <div className="w-32">
                <TextField
                  label="Extra price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
