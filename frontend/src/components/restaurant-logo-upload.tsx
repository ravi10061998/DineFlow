"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Square logo tile for the restaurant's own dashboard. Unlike ProfilePhoto (customer
 * photos, which stay behind an authenticated route), a restaurant logo is served
 * publicly — the same route customers hit — so a plain <img src> works with no
 * blob-fetch dance. `version` (the restaurant's own updatedAt) busts the browser
 * cache after a replace, since the URL itself doesn't change.
 */
export function RestaurantLogoUpload({
  restaurantId,
  hasLogo,
  version,
  onUpload,
  onRemove,
  busy,
}: {
  restaurantId: string;
  hasLogo: boolean;
  version: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFileError("Unsupported file type. Allowed: JPEG, PNG, WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFileError("Image is too large. Max size is 5MB.");
      return;
    }
    setFileError(null);
    setBroken(false);
    onUpload(file);
  }

  const src = hasLogo && !broken ? `${API_URL}/restaurants/${restaurantId}/logo?v=${encodeURIComponent(version)}` : null;

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-amber-100 to-rose-100 text-2xl">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own public API, not something Next's image optimizer can reach
          <img src={src} alt="Restaurant logo" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        ) : (
          "🍽️"
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" loading={busy} onClick={() => fileInputRef.current?.click()}>
            {hasLogo ? "Change logo" : "Upload logo"}
          </Button>
          {hasLogo && (
            <Button type="button" variant="danger" loading={busy} onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        <p className="text-xs text-slate-400">Shown to customers on your restaurant card and menu page. JPEG, PNG or WebP, up to 5MB.</p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
      </div>
    </div>
  );
}
