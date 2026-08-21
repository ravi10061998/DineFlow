"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { useAuth } from "@/lib/auth-context";
import type { MenuCategory } from "@/lib/cart-types";
import { Logo } from "@/components/logo";
import { ErrorBanner } from "@/components/ui/error-banner";
import { MenuProductCard } from "./menu-product-card";

export default function RestaurantMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const { data: menu, loading, error } = useApiQuery(() => api.get<MenuCategory[]>(`/restaurants/${restaurantId}/menu`), [restaurantId]);

  const canOrder = user?.role === "CUSTOMER";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/restaurants" className="text-slate-500 hover:text-slate-900">
            All restaurants
          </Link>
          <Link href="/cart" className="font-medium text-slate-700 hover:text-slate-900">
            View cart
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <ErrorBanner message={error} />

        {!user && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>{" "}
            as a customer to add items to your cart.
          </div>
        )}
        {user && !canOrder && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Only customer accounts can order — this account is a {user.role.toLowerCase().replace("_", " ")} account.
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading menu…</p>
        ) : menu?.length === 0 ? (
          <p className="text-slate-400">This restaurant hasn&apos;t published a menu yet.</p>
        ) : (
          <div className="space-y-8">
            {menu?.map((category) => (
              <div key={category.id}>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">{category.name}</h2>
                {category.products.length === 0 ? (
                  <p className="text-sm text-slate-400">No items in this category yet.</p>
                ) : (
                  <div className="space-y-3">
                    {category.products.map((product) => (
                      <MenuProductCard key={product.id} product={product} canOrder={canOrder} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
