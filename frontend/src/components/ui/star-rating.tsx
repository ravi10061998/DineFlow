/** Read-only star display for a REAL average rating — renders nothing when there's no review data yet, never a fabricated placeholder. */
export function StarRating({ avgRating, reviewCount, size = "sm" }: { avgRating: number | null; reviewCount: number; size?: "sm" | "md" }) {
  if (avgRating === null || reviewCount === 0) return null;
  const textSize = size === "md" ? "text-sm" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1 ${textSize} font-medium text-amber-600`}>
      <span aria-hidden>★</span>
      {avgRating.toFixed(1)}
      <span className="text-slate-400">({reviewCount})</span>
    </span>
  );
}
