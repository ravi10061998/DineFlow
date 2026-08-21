"use client";

import Link from "next/link";
import type { StoreRestaurant } from "@/lib/home-types";
import { FavoriteButton } from "./favorite-button";

/** No star rating is shown — there's no Reviews module yet, and a fabricated number would be worse than none. */
export function RestaurantCard({ restaurant }: { restaurant: StoreRestaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="block w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:w-48"
    >
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-amber-100 to-rose-100 text-3xl sm:h-28">
        🍽️
        {restaurant.isFeatured && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Featured
          </span>
        )}
        <div className="absolute top-1.5 right-1.5">
          <FavoriteButton targetType="RESTAURANT" targetId={restaurant.id} />
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{restaurant.name}</p>
        <p className="truncate text-xs text-slate-500">
          {restaurant.city}, {restaurant.state}
        </p>
        {restaurant.distanceKm !== undefined && (
          <p className="mt-1 text-xs font-medium text-orange-600">{restaurant.distanceKm} km away</p>
        )}
      </div>
    </Link>
  );
}
