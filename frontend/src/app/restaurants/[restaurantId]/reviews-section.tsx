"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Review } from "@/lib/review-types";
import { ErrorBanner } from "@/components/ui/error-banner";

export function ReviewsSection({ restaurantId }: { restaurantId: string }) {
  const { data: reviews, loading, error } = useApiQuery(() => api.get<Review[]>(`/restaurants/${restaurantId}/reviews`), [restaurantId]);

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Reviews</h2>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="text-slate-500">Loading reviews…</p>
      ) : reviews?.length === 0 ? (
        <p className="text-slate-400">No reviews yet — be the first to order and review!</p>
      ) : (
        <ul className="space-y-4">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{r.customer?.fullName ?? "A customer"}</span>
                <span className="text-amber-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
              <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
              {r.restaurantResponse && (
                <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-700">Response from the restaurant</p>
                  <p className="text-slate-600">{r.restaurantResponse}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
