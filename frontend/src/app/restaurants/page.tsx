"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { PublicRestaurant } from "@/lib/cart-types";
import { Logo } from "@/components/logo";
import { ErrorBanner } from "@/components/ui/error-banner";
import { FavoriteButton } from "@/components/home/favorite-button";

function BrowseRestaurantsContent() {
  const { data: restaurants, loading, error } = useApiQuery(() => api.get<PublicRestaurant[]>("/restaurants"));
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const visible = search ? restaurants?.filter((r) => r.name.toLowerCase().includes(search)) : restaurants;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/cart" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          View cart
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Restaurants near you</h1>
        <p className="mt-1 text-sm text-slate-500">
          {search ? `Showing results for "${search}"` : "Pick a restaurant to see its menu."}
        </p>

        <ErrorBanner message={error} />

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : visible?.length === 0 ? (
          <p className="mt-6 text-slate-400">
            {search ? `No restaurants match "${search}".` : "No restaurants are open right now — check back soon."}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {visible?.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
                <Link href={`/restaurants/${r.id}`} className="block flex-1">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-sm text-slate-500">
                    {r.city}, {r.state}
                  </p>
                </Link>
                <FavoriteButton targetType="RESTAURANT" targetId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function BrowseRestaurantsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <BrowseRestaurantsContent />
    </Suspense>
  );
}
