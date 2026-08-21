"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/home-types";
import { StoreProductImage } from "./store-image";
import { FavoriteButton } from "./favorite-button";

/**
 * Tapping a product doesn't add it to a cart directly from the homepage — it lands on
 * that restaurant's menu page, where variant/addon selection and cross-restaurant cart
 * conflict handling already live (Module 10). Duplicating that logic here would be two
 * sources of truth for the same cart rules.
 */
export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link
      href={`/restaurants/${product.restaurantId}`}
      className="block w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:w-48"
    >
      <div className="relative h-24 sm:h-28">
        <StoreProductImage
          restaurantId={product.restaurantId}
          productId={product.id}
          image={product.images[0] as { id: string } | undefined}
          alt={product.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-1.5 right-1.5">
          <FavoriteButton targetType="PRODUCT" targetId={product.id} />
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
        <p className="truncate text-xs text-slate-500">{product.restaurantName}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">₹{product.basePrice}</p>
      </div>
    </Link>
  );
}
