"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Product } from "@/lib/product-types";
import { Modal } from "@/components/ui/modal";
import { ErrorBanner } from "@/components/ui/error-banner";

export function ProductsModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const { data: products, loading, error } = useApiQuery(
    () => api.get<Product[]>(`/admin/restaurants/${restaurantId}/products`),
    [restaurantId],
  );

  return (
    <Modal title="Menu Products" onClose={onClose}>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : products?.length === 0 ? (
        <p className="text-slate-400">This restaurant hasn&apos;t added any products yet.</p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
          {products?.map((product) => (
            <li key={product.id} className="rounded-md border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className={product.isActive ? "text-slate-900" : "text-slate-400 line-through"}>{product.name}</span>
                <span className="font-medium text-slate-700">₹{product.basePrice}</span>
              </div>
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
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
