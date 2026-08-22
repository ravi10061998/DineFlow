"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Review } from "@/lib/review-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useState } from "react";

export default function AdminReviewsPage() {
  const { data: reviews, loading, error, reload } = useApiQuery(() => api.get<Review[]>("/admin/reviews"));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(review: Review) {
    if (!window.confirm(`Remove this review${review.customer ? ` by ${review.customer.fullName}` : ""}? This cannot be undone.`)) return;
    setActionError(null);
    setBusyId(review.id);
    try {
      await api.delete(`/admin/reviews/${review.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
      <p className="mt-1 text-sm text-slate-500">Platform-wide moderation — remove a review for abuse or policy violations.</p>

      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No reviews yet.
                  </td>
                </tr>
              )}
              {reviews?.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{r.customer?.fullName ?? r.customerId}</td>
                  <td className="px-4 py-3 text-slate-600">{r.restaurant?.name ?? r.restaurantId}</td>
                  <td className="px-4 py-3 text-amber-600">{"★".repeat(r.rating)}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-600">{r.comment ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="danger" loading={busyId === r.id} onClick={() => remove(r)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
