"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { FavoriteTargetType } from "@/lib/favorite-types";

/**
 * A heart-icon toggle reusable on restaurant and product cards alike. Not
 * wired to a shared favorites list here (each card owns its own optimistic
 * boolean) — the full list with removal lives on /favorites.
 */
export function FavoriteButton({
  targetType,
  targetId,
  initialFavorited = false,
}: {
  targetType: FavoriteTargetType;
  targetId: string;
  initialFavorited?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || user.role !== "CUSTOMER") {
      router.push("/login");
      return;
    }
    setBusy(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      if (next) {
        await api.post("/customer/me/favorites", { targetType, targetId });
      } else {
        const list = await api.get<{ id: string; targetType: string; targetId: string }[]>("/customer/me/favorites");
        const match = list.find((f) => f.targetType === targetType && f.targetId === targetId);
        if (match) await api.delete(`/customer/me/favorites/${match.id}`);
      }
    } catch {
      setFavorited(!next); // roll back on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:bg-white disabled:opacity-50"
    >
      {favorited ? <span className="text-rose-600">♥</span> : <span className="text-slate-400">♡</span>}
    </button>
  );
}
