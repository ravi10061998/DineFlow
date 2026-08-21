"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Category } from "@/lib/category-types";
import { Modal } from "@/components/ui/modal";
import { ErrorBanner } from "@/components/ui/error-banner";

export function CategoriesModal({ restaurantId, onClose }: { restaurantId: string; onClose: () => void }) {
  const { data: categories, loading, error } = useApiQuery(
    () => api.get<Category[]>(`/admin/restaurants/${restaurantId}/categories`),
    [restaurantId],
  );

  return (
    <Modal title="Menu Categories" onClose={onClose}>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : categories?.length === 0 ? (
        <p className="text-slate-400">This restaurant hasn&apos;t added any menu categories yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {categories?.map((category) => (
            <li key={category.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
              <span className={category.isActive ? "text-slate-900" : "text-slate-400 line-through"}>{category.name}</span>
              <span className={category.isActive ? "text-green-700" : "text-slate-400"}>
                {category.isActive ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
