"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Review } from "@/lib/review-types";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/textarea-field";
import { ErrorBanner } from "@/components/ui/error-banner";

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={n <= value ? "text-amber-500" : "text-slate-300"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewPanel({ orderId }: { orderId: string }) {
  const { data: reviews, loading, error, setData } = useApiQuery(() => api.get<Review[]>("/customer/me/reviews"));
  const existing = reviews?.find((r) => r.orderId === orderId) ?? null;

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return null;

  async function submit() {
    setSaving(true);
    setSaveError(null);
    try {
      if (existing) {
        const updated = await api.patch<Review>(`/customer/me/reviews/${existing.id}`, { rating, comment: comment || undefined });
        setData((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.post<Review>("/customer/me/reviews", { orderId, rating, comment: comment || undefined });
        setData((prev) => [...(prev ?? []), created]);
      }
      setEditing(false);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Your review</h2>
      <ErrorBanner message={error} />

      {existing && !editing ? (
        <div>
          <p className="text-amber-600">
            {"★".repeat(existing.rating)}
            {"☆".repeat(5 - existing.rating)}
          </p>
          {existing.comment && <p className="mt-1 text-sm text-slate-600">{existing.comment}</p>}
          {existing.restaurantResponse && (
            <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Response from the restaurant</p>
              <p className="text-slate-600">{existing.restaurantResponse}</p>
            </div>
          )}
          <Button variant="secondary" className="mt-2" onClick={() => setEditing(true)}>
            Edit review
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <StarPicker value={rating} onChange={setRating} />
          <TextAreaField
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the food and delivery?"
          />
          <ErrorBanner message={saveError} />
          <div className="flex gap-2">
            <Button loading={saving} onClick={submit}>
              {existing ? "Save changes" : "Submit review"}
            </Button>
            {existing && (
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
