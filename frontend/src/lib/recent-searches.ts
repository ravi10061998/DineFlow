"use client";

const STORAGE_KEY = "df_recent_searches";
const MAX_ENTRIES = 8;

/** Plain localStorage list, most-recent-first, de-duplicated case-insensitively. */
export const recentSearches = {
  list(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },

  add(query: string): void {
    if (typeof window === "undefined") return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = recentSearches.list().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
