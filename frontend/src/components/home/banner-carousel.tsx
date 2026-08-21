"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Banner } from "@/lib/home-types";
import { StoreImage } from "./store-image";

const AUTO_SLIDE_MS = 5000;

/** Auto-sliding promotional banner. Admin-managed content (Module: Banners) — never hardcoded. */
export function BannerCarousel({ banners, loading, error }: { banners: Banner[] | null; loading: boolean; error: string | null }) {
  const [index, setIndex] = useState(0);
  const count = banners?.length ?? 0;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (error) return null; // a missing promo strip shouldn't visually break the page — the rest of the homepage still works
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <Skeleton className="h-40 w-full rounded-xl sm:h-56" />
      </div>
    );
  }
  if (!banners || banners.length === 0) return null;

  const banner = banners[index];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <div className="relative h-40 overflow-hidden rounded-xl sm:h-56">
        {banner.ctaUrl ? (
          <a href={banner.ctaUrl} className="block h-full w-full">
            <BannerContent banner={banner} />
          </a>
        ) : (
          <BannerContent banner={banner} />
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BannerContent({ banner }: { banner: Banner }) {
  return (
    <div className="relative h-full w-full">
      <StoreImage src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/60 via-black/20 to-transparent px-6">
        <p className="max-w-xs text-lg font-bold text-white drop-shadow sm:text-2xl">{banner.title}</p>
        {banner.subtitle && <p className="mt-1 max-w-xs text-sm text-white/90 drop-shadow">{banner.subtitle}</p>}
        {banner.ctaLabel && (
          <span className="mt-3 inline-block w-fit rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900">
            {banner.ctaLabel}
          </span>
        )}
      </div>
    </div>
  );
}
