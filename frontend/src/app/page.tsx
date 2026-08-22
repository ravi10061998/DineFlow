"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/lib/auth-context";
import { locationStore, type DeliveryLocation } from "@/lib/location-store";
import type { HomeFeed, HomePersonalization, StoreRestaurant } from "@/lib/home-types";
import { SiteHeader } from "@/components/home/site-header";
import { MobileBottomNav } from "@/components/home/mobile-bottom-nav";
import { SiteFooter } from "@/components/home/site-footer";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { CategoryStrip } from "@/components/home/category-strip";
import { FilterChips, type QuickFilterKey } from "@/components/home/filter-chips";
import { CarouselSection } from "@/components/home/carousel-section";
import { RestaurantCard } from "@/components/home/restaurant-card";
import { ProductCard } from "@/components/home/product-card";
import { OfferCard } from "@/components/home/offer-card";
import { OrderAgainCard } from "@/components/home/order-again-card";
import { BlogCard } from "@/components/home/blog-card";

// Admin and restaurant staff have their own dashboard "home" — landing them in the
// customer marketplace first, with just a small header link out, made their own
// portal feel like an afterthought. This is a plain lookup table (not role.startsWith
// string matching scattered around) so adding a role later means one line here.
const PORTAL_HOME: Record<string, string> = {
  ADMIN: "/admin",
  RESTAURANT_ADMIN: "/restaurant",
  RESTAURANT_STAFF: "/restaurant",
  DELIVERY_PARTNER: "/delivery",
};

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isCustomer = user?.role === "CUSTOMER";
  const portalHome = user ? PORTAL_HOME[user.role] : undefined;

  useEffect(() => {
    if (!authLoading && portalHome) router.replace(portalHome);
  }, [authLoading, portalHome, router]);

  // The bulk of the fold loads as one aggregate call (GET /store/home) for
  // performance — it's a single independently-retryable unit. Personalization
  // and nearby-restaurants are separate, independently-fetched sections so a
  // failure or an absent precondition (no session, no location) in either
  // never affects the other or the aggregate above.
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [personalization, setPersonalization] = useState<HomePersonalization | null>(null);
  const [personalizationLoading, setPersonalizationLoading] = useState(false);
  const [personalizationError, setPersonalizationError] = useState<string | null>(null);

  const [location, setLocation] = useState<DeliveryLocation | null>(() => locationStore.get());
  const [nearby, setNearby] = useState<StoreRestaurant[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<QuickFilterKey[]>([]);

  const loadFeed = useCallback(() => {
    setFeedLoading(true);
    setFeedError(null);
    api
      .get<HomeFeed>("/store/home")
      .then(setFeed)
      .catch((err) => setFeedError(getErrorMessage(err)))
      .finally(() => setFeedLoading(false));
  }, []);

  const loadPersonalization = useCallback(() => {
    setPersonalizationLoading(true);
    setPersonalizationError(null);
    api
      .get<HomePersonalization>("/customer/me/home-personalization")
      .then(setPersonalization)
      .catch((err) => setPersonalizationError(getErrorMessage(err)))
      .finally(() => setPersonalizationLoading(false));
  }, []);

  const loadNearby = useCallback((loc: DeliveryLocation) => {
    setNearbyLoading(true);
    setNearbyError(null);
    api
      .get<StoreRestaurant[]>(`/store/restaurants/nearby?lat=${loc.lat}&lng=${loc.lng}`)
      .then(setNearby)
      .catch((err) => setNearbyError(getErrorMessage(err)))
      .finally(() => setNearbyLoading(false));
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (isCustomer) loadPersonalization();
  }, [isCustomer, loadPersonalization]);

  useEffect(() => {
    if (location) loadNearby(location);
  }, [location, loadNearby]);

  function handleLocationChange(next: DeliveryLocation | null) {
    setLocation(next);
    if (!next) {
      setNearby(null);
      setNearbyError(null);
    }
  }

  function toggleFilter(key: QuickFilterKey) {
    setActiveFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const showFeatured = activeFilters.length === 0 || activeFilters.includes("featured");
  const showNearby = activeFilters.length === 0 || activeFilters.includes("nearby");
  const showOffers = activeFilters.length === 0 || activeFilters.includes("offers");
  const showPopularAndOthers = activeFilters.length === 0;

  // The cuisine strip is a browse affordance, not a filter: products/restaurants aren't
  // tagged with a food category anywhere in the schema yet, so `selectedCategory` only
  // drives the strip's own highlight state rather than pretending to filter results below.

  // While auth is still resolving, or an admin/restaurant user is being bounced to their
  // own dashboard, don't flash the customer storefront underneath them first.
  if (authLoading || portalHome) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 sm:pb-0">
      <SiteHeader onLocationChange={handleLocationChange} />
      <MobileBottomNav />

      <BannerCarousel banners={feed?.banners ?? null} loading={feedLoading} error={feedError} />

      <CategoryStrip
        categories={feed?.categories ?? null}
        loading={feedLoading}
        error={feedError}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FilterChips active={activeFilters} onToggle={toggleFilter} />

      {showFeatured && (
        <CarouselSection
          title="Featured restaurants"
          items={feed?.featuredRestaurants ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(r) => <RestaurantCard restaurant={r} />}
          emptyMessage="No featured restaurants right now — check back soon."
        />
      )}

      {showPopularAndOthers && (
        <CarouselSection
          title="Popular near everyone"
          items={feed?.popularRestaurants ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(r) => <RestaurantCard restaurant={r} />}
          emptyMessage="Not enough orders yet to rank popular restaurants."
        />
      )}

      {isCustomer && (
        <CarouselSection
          title="Recommended for you"
          items={personalization?.recommendedRestaurants ?? null}
          loading={personalizationLoading}
          error={personalizationError}
          onRetry={loadPersonalization}
          renderItem={(r) => <RestaurantCard restaurant={r} />}
          emptyMessage="Order a few times and we'll start recommending restaurants for you."
        />
      )}

      {showPopularAndOthers && (
        <CarouselSection
          title="Popular dishes"
          items={feed?.popularProducts ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(p) => <ProductCard product={p} />}
          emptyMessage="No dish ordering data yet."
        />
      )}

      {showOffers && (
        <CarouselSection
          title="Offers for you"
          items={feed?.offers ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(o) => <OfferCard offer={o} />}
          emptyMessage="No active offers right now."
        />
      )}

      {isCustomer && (
        <CarouselSection
          title="Order again"
          items={personalization?.recentlyOrdered ?? null}
          loading={personalizationLoading}
          error={personalizationError}
          onRetry={loadPersonalization}
          renderItem={(p) => <OrderAgainCard product={p} />}
          emptyMessage="You haven't ordered anything yet."
        />
      )}

      {showNearby &&
        (location ? (
          <CarouselSection
            title="Nearby restaurants"
            items={nearby}
            loading={nearbyLoading}
            error={nearbyError}
            onRetry={() => loadNearby(location)}
            renderItem={(r) => <RestaurantCard restaurant={r} />}
            emptyMessage="No restaurants deliver to your area yet."
          />
        ) : (
          <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Nearby restaurants</h2>
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Set your delivery location above to see restaurants near you.
            </p>
          </section>
        ))}

      {showPopularAndOthers && (
        <CarouselSection
          title="Trending this month"
          items={feed?.trendingProducts ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(p) => <ProductCard product={p} />}
          emptyMessage="Nothing trending yet."
        />
      )}

      {showPopularAndOthers && (
        <CarouselSection
          title="From the food blog"
          viewAllHref="/blogs"
          items={feed?.blogs ?? null}
          loading={feedLoading}
          error={feedError}
          onRetry={loadFeed}
          renderItem={(b) => <BlogCard blog={b} />}
          emptyMessage="No articles published yet."
        />
      )}

      <SiteFooter />
    </div>
  );
}
