"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAuthenticatedBlob } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Circular avatar for the customer profile page — fetched via blob since <img src> can't carry a Bearer token. */
export function ProfilePhoto({
  hasPhoto,
  onUpload,
  onRemove,
  busy,
}: {
  hasPhoto: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setObjectUrl(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    fetchAuthenticatedBlob("/customer/me/profile-photo/file")
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setObjectUrl(u);
      })
      .catch(() => setObjectUrl(null));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasPhoto]);

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
    onUpload(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-400">
        {objectUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL, not a static/remote asset Next can optimize
          <img src={objectUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          "?"
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" loading={busy} onClick={() => fileInputRef.current?.click()}>
            {hasPhoto ? "Change photo" : "Upload photo"}
          </Button>
          {hasPhoto && (
            <Button type="button" variant="danger" loading={busy} onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
      </div>
    </div>
  );
}
