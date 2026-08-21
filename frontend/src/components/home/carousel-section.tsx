"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared shell for every horizontally-scrolling homepage section (restaurants,
 * products, offers, blogs). Centralizing loading/empty/error here means every
 * section gets the same skeleton-then-content-or-empty-or-error behavior for free,
 * and a failure in one section can never take any other section down with it.
 */
export function CarouselSection<T>({
  title,
  viewAllHref,
  items,
  loading,
  error,
  onRetry,
  renderItem,
  emptyMessage,
  skeletonCount = 4,
}: {
  title: string;
  viewAllHref?: string;
  items: T[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  skeletonCount?: number;
}) {
  const hasItems = !loading && !error && items && items.length > 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {viewAllHref && hasItems && (
          <Link href={viewAllHref} className="text-sm font-medium text-orange-600 hover:text-orange-700">
            View all →
          </Link>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-3 font-medium underline">
              Retry
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-40 shrink-0 sm:w-48" />
          ))}
        </div>
      ) : !hasItems ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items!.map((item, i) => (
            <div key={i} className="shrink-0">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
