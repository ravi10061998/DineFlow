"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Review } from "@/lib/review-types";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantReviewsPage() {
  const { data: reviews, loading, error, setData } = useApiQuery(() => api.get<Review[]>("/restaurant/me/reviews"));
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openRespond(review: Review) {
    setRespondingTo(review.id);
    setResponseText(review.restaurantResponse ?? "");
    setSaveError(null);
  }

  async function submitResponse(id: string) {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<Review>(`/restaurant/me/reviews/${id}/respond`, { response: responseText });
      setData((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)));
      setRespondingTo(null);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const avg = reviews && reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
        {avg && (
          <p className="text-sm text-slate-600">
            Average rating: <span className="font-semibold text-amber-600">★ {avg}</span> ({reviews!.length} reviews)
          </p>
        )}
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : reviews?.length === 0 ? (
        <p className="mt-6 text-slate-400">No reviews yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews?.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{r.customer?.fullName ?? "A customer"}</span>
                <span className="text-amber-600">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
              <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>

              {r.restaurantResponse && respondingTo !== r.id && (
                <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-700">Your response</p>
                  <p className="text-slate-600">{r.restaurantResponse}</p>
                </div>
              )}

              {respondingTo === r.id ? (
                <div className="mt-3 space-y-2">
                  <TextAreaField label="Your response" value={responseText} onChange={(e) => setResponseText(e.target.value)} />
                  <ErrorBanner message={saveError} />
                  <div className="flex gap-2">
                    <Button loading={saving} onClick={() => submitResponse(r.id)}>
                      Post response
                    </Button>
                    <Button variant="secondary" onClick={() => setRespondingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" className="mt-2" onClick={() => openRespond(r)}>
                  {r.restaurantResponse ? "Edit response" : "Respond"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
