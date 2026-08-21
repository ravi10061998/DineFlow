"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/home-types";
import { StoreProductImage } from "./store-image";

/**
 * "Order again" deliberately does NOT one-click recreate the exact past order — price,
 * availability, and variants/addons may have changed since. It links to the restaurant's
 * live menu so the customer re-configures and adds it fresh, going through the same
 * server-side validation as any other add-to-cart.
 */
export function OrderAgainCard({ product }: { product: StoreProduct }) {
  return (
    <Link
      href={`/restaurants/${product.restaurantId}`}
      className="block w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:w-48"
    >
      <div className="h-24 sm:h-28">
        <StoreProductImage
          restaurantId={product.restaurantId}
          productId={product.id}
          image={product.images[0] as { id: string } | undefined}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
        <p className="truncate text-xs text-slate-500">{product.restaurantName}</p>
        <span className="mt-2 inline-block rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">Order again</span>
      </div>
    </Link>
  );
}
