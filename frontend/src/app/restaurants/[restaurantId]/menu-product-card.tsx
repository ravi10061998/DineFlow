"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { MenuProduct } from "@/lib/cart-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { StoreProductImage } from "@/components/home/store-image";
import { FavoriteButton } from "@/components/home/favorite-button";

export function MenuProductCard({
  product,
  canOrder,
  restaurantId,
}: {
  product: MenuProduct;
  canOrder: boolean;
  restaurantId: string;
}) {
  const [variantId, setVariantId] = useState<string>(product.variants[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function handleAdd(replaceCart = false) {
    setError(null);
    setAdded(false);
    setAdding(true);
    try {
      await api.post("/customer/me/cart", {
        productId: product.id,
        variantId: variantId || undefined,
        addonIds: addonIds.length > 0 ? addonIds : undefined,
        quantity,
        replaceCart: replaceCart || undefined,
      });
      setAdded(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CART_DIFFERENT_RESTAURANT") {
        if (window.confirm(`${err.message}\n\nClear your cart and add this item instead?`)) {
          return handleAdd(true);
        }
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${product.isAvailable ? "text-slate-900" : "text-slate-400"}`}>{product.name}</p>
          {product.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{product.description}</p>}
          <p className="mt-1.5 text-sm font-semibold text-slate-900">₹{product.basePrice}</p>
          {!product.isAvailable && (
            <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              Currently out of stock
            </span>
          )}
        </div>

        <div className="relative h-28 w-28 shrink-0">
          <StoreProductImage
            restaurantId={restaurantId}
            productId={product.id}
            image={product.images[0] as { id: string } | undefined}
            alt={product.name}
            className={`h-full w-full rounded-lg object-cover ${!product.isAvailable ? "opacity-50 grayscale" : ""}`}
          />
          <div className="absolute top-1.5 right-1.5">
            <FavoriteButton targetType="PRODUCT" targetId={product.id} />
          </div>
        </div>
      </div>

      {canOrder && product.isAvailable && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {product.variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <label
                  key={v.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${variantId === v.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                >
                  <input type="radio" name={`variant-${product.id}`} className="hidden" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                  {v.name} (₹{v.price})
                </label>
              ))}
            </div>
          )}

          {product.addons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.addons.map((a) => (
                <label
                  key={a.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${addonIds.includes(a.id) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                >
                  <input type="checkbox" className="hidden" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />+ {a.name} (₹{a.price})
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-slate-300 bg-white">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-2 py-1 text-slate-600 hover:bg-slate-50">
                −
              </button>
              <span className="px-3 text-sm">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="px-2 py-1 text-slate-600 hover:bg-slate-50">
                +
              </button>
            </div>
            <Button type="button" loading={adding} onClick={() => handleAdd(false)}>
              Add to cart
            </Button>
            {added && <span className="text-sm text-green-700">Added!</span>}
          </div>
          <ErrorBanner message={error} />
        </div>
      )}
    </div>
  );
}
