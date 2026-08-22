import { useState } from "react";
import { Pressable, Text } from "react-native";
import { api } from "../lib/api-client";
import type { Favorite, FavoriteTargetType } from "../lib/types";

/**
 * A heart toggle reusable on restaurant and product cards alike — mirrors
 * frontend's components/home/favorite-button.tsx exactly (optimistic update,
 * roll back on failure, no shared favorites-list state per card).
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
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    try {
      if (next) {
        await api.post("/customer/me/favorites", { targetType, targetId });
      } else {
        const list = await api.get<Favorite[]>("/customer/me/favorites");
        const match = list.find((f) => f.targetType === targetType && f.targetId === targetId);
        if (match) await api.delete(`/customer/me/favorites/${match.id}`);
      }
    } catch {
      setFavorited(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      hitSlop={6}
      className="h-8 w-8 items-center justify-center rounded-full bg-white/90"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <Text style={{ fontSize: 16 }} className={favorited ? "text-rose-600" : "text-slate-400"}>
        {favorited ? "♥" : "♡"}
      </Text>
    </Pressable>
  );
}
