"use client";

import type { FoodCategory } from "@/lib/home-types";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "./store-image";

/** Horizontal cuisine-taxonomy strip. Selecting a category filters the quick-filter chips below it, not a separate page. */
export function CategoryStrip({
  categories,
  loading,
  error,
  selected,
  onSelect,
}: {
  categories: FoodCategory[] | null;
  loading: boolean;
  error: string | null;
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      {error ? (
        <p className="text-sm text-slate-400">Categories couldn&apos;t load — you can still browse restaurants directly.</p>
      ) : loading ? (
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-16 shrink-0 rounded-full" />
          ))}
        </div>
      ) : !categories || categories.length === 0 ? (
        <p className="text-sm text-slate-400">No categories yet.</p>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const active = selected === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(active ? null : cat.slug)}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <StoreImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  className={`h-14 w-14 rounded-full object-cover ring-2 ${active ? "ring-orange-500" : "ring-transparent"}`}
                />
                <span className={`truncate text-xs ${active ? "font-semibold text-orange-600" : "text-slate-600"}`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
