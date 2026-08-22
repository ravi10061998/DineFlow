export type Period = "7d" | "30d" | "90d" | "all";

/**
 * Shared by Analytics (Module 27) and Reports (Module 28) — both need the
 * exact same "period query param -> since date" resolution so a CSV export
 * always covers precisely the same window its on-screen chart did.
 * Anything unrecognized falls back to 30d rather than 400ing — a
 * query-string typo shouldn't break a dashboard or a download.
 */
export function resolvePeriod(period: string | undefined): { label: Period; since: Date | null } {
  if (period === "all") return { label: "all", since: null };
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return { label: (period === "7d" || period === "90d" ? period : "30d") as Period, since };
}
