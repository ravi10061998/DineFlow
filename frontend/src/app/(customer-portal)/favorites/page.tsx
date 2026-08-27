"use client";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Favorite } from "@/lib/favorite-types";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { data: favorites, loading, error, setData } = useApiQuery(() => api.get<Favorite[]>("/customer/me/favorites"));

  async function remove(id: string) {
    try {
      await api.delete(`/customer/me/favorites/${id}`);
      setData((prev) => prev?.filter((f) => f.id !== id) ?? prev);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const restaurants = favorites?.filter((f) => f.targetType === "RESTAURANT") ?? [];
  const products = favorites?.filter((f) => f.targetType === "PRODUCT") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Your favorites</h1>

      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : favorites?.length === 0 ? (
        <div className="max-w-3xl rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-400">You haven&apos;t favorited anything yet.</p>
          <Link href="/" className="mt-3 inline-block font-medium text-slate-900 underline">
            Browse the homepage
          </Link>
        </div>
      ) : (
        <div className="max-w-3xl space-y-8">
          {restaurants.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Restaurants</h2>
              <ul className="space-y-2">
                {restaurants.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <Link href={`/restaurants/${f.restaurant?.id ?? f.targetId}`} className="flex-1">
                      <p className="font-medium text-slate-900">{f.restaurant?.name ?? "Restaurant"}</p>
                      {f.restaurant?.city && <p className="text-sm text-slate-500">{f.restaurant.city}</p>}
                    </Link>
                    <Button variant="secondary" onClick={() => remove(f.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {products.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Dishes</h2>
              <ul className="space-y-2">
                {products.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{f.product?.name ?? "Dish"}</p>
                      {f.product?.basePrice && <p className="text-sm text-slate-500">₹{f.product.basePrice}</p>}
                    </div>
                    <Button variant="secondary" onClick={() => remove(f.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
