"use client";

import { useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Category } from "@/lib/category-types";
import type { Product } from "@/lib/product-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ProductCard } from "./product-card";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function RestaurantProductsPage() {
  const { data: categories, error: categoriesError } = useApiQuery(() => api.get<Category[]>("/restaurant/me/categories"));
  const { data: products, loading, error, reload, setData } = useApiQuery(() => api.get<Product[]>("/restaurant/me/products"));

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeCategoryId = categoryId || categories?.[0]?.id || "";

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setCreateError("Unsupported file type. Allowed: JPEG, PNG, WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setCreateError("Image is too large. Max size is 5MB.");
      e.target.value = "";
      return;
    }
    setCreateError(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function clearImageSelection() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!activeCategoryId) {
      setCreateError("Create a menu category first.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const created = await api.post<Product>("/restaurant/me/products", {
        categoryId: activeCategoryId,
        name,
        description: description || undefined,
        basePrice: Number(basePrice),
      });

      // The image upload is a second call against an already-created product (that's the only
      // shape the backend's multer-based upload route supports — see product-images.service.ts) —
      // but from the restaurant owner's side this is still one form, one submit, one step.
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          await api.upload(`/restaurant/me/products/${created.id}/images`, formData);
        } catch (imgErr) {
          setCreateError(`Product created, but the photo failed to upload: ${getErrorMessage(imgErr)}`);
        }
      }

      setName("");
      setDescription("");
      setBasePrice("");
      clearImageSelection();
      reload();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function moveWithinCategory(catId: string, catProducts: Product[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= catProducts.length) return;

    const reordered = [...catProducts];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    if (products) {
      const otherProducts = products.filter((p) => p.categoryId !== catId);
      setData([...otherProducts, ...reordered]); // optimistic; server order is reconciled by reload()
    }

    setListError(null);
    try {
      await api.put("/restaurant/me/products/reorder", { categoryId: catId, orderedIds: reordered.map((p) => p.id) });
      reload();
    } catch (err) {
      setListError(getErrorMessage(err));
      reload(); // roll back to the server's actual order
    }
  }

  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  const grouped = new Map<string, Product[]>();
  for (const product of products ?? []) {
    const list = grouped.get(product.categoryId) ?? [];
    list.push(product);
    grouped.set(product.categoryId, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const orderedCategoryIds = [...grouped.keys()].sort((a, b) => {
    const aOrder = categoriesById.get(a)?.sortOrder ?? 0;
    const bOrder = categoriesById.get(b)?.sortOrder ?? 0;
    return aOrder - bOrder;
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add menu items to your categories, with variants, add-ons, availability, and photos.
        </p>
      </div>

      <ErrorBanner message={categoriesError} />

      {categories?.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You need at least one menu category before adding products. Create one on the{" "}
          <a href="/restaurant/categories" className="font-medium underline">
            Menu Categories
          </a>{" "}
          page first.
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-product-category" className="text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="new-product-category"
                value={activeCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField label="Name" placeholder="e.g. Margherita Pizza" required value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              label="Base price"
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 249"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
            <div className="col-span-2">
              <TextAreaField
                label="Description (optional)"
                placeholder="Optional"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Photo (optional)</label>
              <div className="flex items-center gap-3">
                {imagePreviewUrl ? (
                  <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL for an unsaved file, not a static/remote asset */}
                    <img src={imagePreviewUrl} alt="Selected product photo" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove selected photo"
                      onClick={clearImageSelection}
                      className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
                  >
                    + Add photo
                  </button>
                )}
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelected} />
                <p className="text-xs text-slate-400">JPEG, PNG, or WebP, up to 5MB. You can also add or change this later.</p>
              </div>
            </div>
          </div>
          <Button type="submit" loading={creating}>
            Add product
          </Button>
        </form>
      )}
      <ErrorBanner message={createError} />
      <ErrorBanner message={error ?? listError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : products?.length === 0 ? (
        <p className="text-slate-400">No products yet — add your first one above.</p>
      ) : (
        <div className="space-y-6">
          {orderedCategoryIds.map((catId) => {
            const catProducts = grouped.get(catId) ?? [];
            return (
              <div key={catId}>
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  {categoriesById.get(catId)?.name ?? "Uncategorized"}
                </h2>
                <ul className="space-y-2">
                  {catProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      categories={categories ?? []}
                      isFirst={index === 0}
                      isLast={index === catProducts.length - 1}
                      onMove={(direction) => moveWithinCategory(catId, catProducts, index, direction)}
                      onChanged={reload}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
