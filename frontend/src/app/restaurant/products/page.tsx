"use client";

import { useState, type FormEvent } from "react";
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

  const activeCategoryId = categoryId || categories?.[0]?.id || "";

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!activeCategoryId) {
      setCreateError("Create a menu category first.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await api.post("/restaurant/me/products", {
        categoryId: activeCategoryId,
        name,
        description: description || undefined,
        basePrice: Number(basePrice),
      });
      setName("");
      setDescription("");
      setBasePrice("");
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
