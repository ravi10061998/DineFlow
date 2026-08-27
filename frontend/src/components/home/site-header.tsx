"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import type { DeliveryLocation } from "@/lib/location-store";
import { LocationSelector } from "./location-selector";
import { SearchBar } from "./search-bar";
import { NotificationDropdown } from "./notification-dropdown";
import { CartPreview } from "./cart-preview";

export function SiteHeader({ onLocationChange }: { onLocationChange: (location: DeliveryLocation | null) => void }) {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <LocationSelector onLocationChange={onLocationChange} />
        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-2">
          {/* The carousels below (Featured/Popular/Nearby/Trending) are all deliberately filtered
           * (see store.service.ts) -- a brand-new restaurant with no orders yet won't appear in any
           * of them. This is the one link that always lists every approved restaurant, unfiltered. */}
          <Link href="/restaurants" className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline">
            Restaurants
          </Link>
          {!isLoading && user ? (
            <>
              {user.role === "CUSTOMER" && (
                <>
                  <NotificationDropdown />
                  <CartPreview />
                  <Link href="/favorites" aria-label="Favorites" className="hidden h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-slate-100 sm:flex">
                    ♥
                  </Link>
                  <Link href="/orders" className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline">
                    Orders
                  </Link>
                  <Link href="/profile" className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline">
                    Profile
                  </Link>
                </>
              )}
              {user.role !== "CUSTOMER" && (
                <Link
                  href={user.role === "ADMIN" ? "/admin" : "/restaurant"}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Dashboard
                </Link>
              )}
              <button onClick={() => logout()} className="hidden text-sm text-slate-500 hover:text-slate-700 sm:inline">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Sign in
              </Link>
              <Link href="/register" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
