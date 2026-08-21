/** A pulsing placeholder block — every dynamic homepage section uses this instead of an empty white area while its API loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`} />;
}
