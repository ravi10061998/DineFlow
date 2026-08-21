"use client";

import { useEffect, useState } from "react";
import { fetchAuthenticatedBlob } from "@/lib/api-client";

/**
 * Product photos are served from an authenticated route (`<img src>` can't carry a
 * Bearer token), so this fetches the bytes once and renders them via an object URL.
 */
export function ProductImageThumb({ src, alt, onDelete }: { src: string; alt: string; onDelete?: () => void }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    fetchAuthenticatedBlob(src)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setObjectUrl(u);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      {objectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL, not a static/remote asset Next can optimize
        <img src={objectUrl} alt={alt} className="h-full w-full object-cover" />
      ) : failed ? (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Failed</div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">…</div>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Delete image"
          onClick={onDelete}
          className="absolute top-0.5 right-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80 group-hover:flex"
        >
          ✕
        </button>
      )}
    </div>
  );
}
