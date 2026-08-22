"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface StoreImageProps {
  /** Full URL (banners/food-categories store an admin-provided imageUrl directly) or null. */
  src: string | null;
  alt: string;
  className?: string;
}

/** Renders admin-provided image URLs (banners, food categories) with a graceful fallback tile. */
export function StoreImage({ src, alt, className }: StoreImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-100 to-rose-100 text-2xl ${className ?? ""}`}>
        🍽️
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL, not a local/remote asset Next can optimize
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

/**
 * Product photos ARE served publicly now (the menu.controller.ts public route added
 * alongside this module), so unlike the authenticated-only ProductImageThumb used in the
 * restaurant back-office, a plain <img src> works here without the blob-fetch dance.
 */
export function StoreProductImage({
  restaurantId,
  productId,
  image,
  alt,
  className,
}: {
  restaurantId: string;
  productId: string;
  image: { id: string } | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-100 to-rose-100 text-2xl ${className ?? ""}`}>
        🍴
      </div>
    );
  }
  const src = `${API_URL}/restaurants/${restaurantId}/menu/products/${productId}/images/${image.id}/file`;
  // eslint-disable-next-line @next/next/no-img-element -- served from our own public API, not something Next's image optimizer can reach
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

/** A restaurant's logo, also served publicly (`GET /restaurants/:id/logo`) — same reasoning as product photos. */
export function RestaurantLogoImage({
  restaurantId,
  hasLogo,
  alt,
  className,
}: {
  restaurantId: string;
  hasLogo: boolean;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!hasLogo || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-100 to-rose-100 text-2xl ${className ?? ""}`}>
        🍽️
      </div>
    );
  }
  const src = `${API_URL}/restaurants/${restaurantId}/logo`;
  // eslint-disable-next-line @next/next/no-img-element -- served from our own public API, not something Next's image optimizer can reach
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
