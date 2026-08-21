"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { MenuProduct } from "@/lib/cart-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";

export function MenuProductCard({ product, canOrder }: { product: MenuProduct; canOrder: boolean }) {
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-medium ${product.isAvailable ? "text-slate-900" : "text-slate-400"}`}>{product.name}</p>
          {product.description && <p className="text-sm text-slate-500">{product.description}</p>}
          <p className="mt-1 text-sm font-semibold text-slate-700">₹{product.basePrice}</p>
          {!product.isAvailable && <p className="text-xs text-red-600">Currently out of stock</p>}
        </div>
      </div>

      {canOrder && product.isAvailable && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {product.variants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <label key={v.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${variantId === v.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"}`}>
                  <input type="radio" name={`variant-${product.id}`} className="hidden" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                  {v.name} (₹{v.price})
                </label>
              ))}
            </div>
          )}

          {product.addons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.addons.map((a) => (
                <label key={a.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${addonIds.includes(a.id) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"}`}>
                  <input type="checkbox" className="hidden" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                  + {a.name} (₹{a.price})
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-slate-300">
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
