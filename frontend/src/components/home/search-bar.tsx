"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { recentSearches } from "@/lib/recent-searches";
import type { SearchResults } from "@/lib/home-types";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      api
        .get<SearchResults>(`/store/search?q=${encodeURIComponent(query.trim())}`)
        .then(setResults)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function runSearch(q: string) {
    if (!q.trim()) return;
    recentSearches.add(q);
    setQuery(q);
    setOpen(false);
    router.push(`/restaurants?search=${encodeURIComponent(q.trim())}`);
  }

  const showRecent = open && query.trim().length < MIN_QUERY_LENGTH;
  const recent = recentSearches.list();

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
        placeholder="Search restaurants, dishes…"
        className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-slate-500 focus:bg-white focus:ring-1 focus:ring-slate-500"
      />

      {open && (showRecent || query.trim().length >= MIN_QUERY_LENGTH) && (
        <div className="absolute top-full left-0 z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {showRecent ? (
            recent.length > 0 ? (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-slate-400">Recent searches</span>
                  <button type="button" onClick={() => recentSearches.clear()} className="text-xs text-slate-400 hover:text-slate-600">
                    Clear
                  </button>
                </div>
                {recent.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => runSearch(q)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    🕑 {q}
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-slate-400">Start typing to search restaurants and dishes.</p>
            )
          ) : error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="p-4 text-sm text-slate-400">Searching…</p>
          ) : !results || (results.restaurants.length === 0 && results.products.length === 0 && results.categories.length === 0) ? (
            <p className="p-4 text-sm text-slate-400">No matches for &quot;{query}&quot;.</p>
          ) : (
            <div className="p-2">
              {results.restaurants.length > 0 && (
                <ResultGroup title="Restaurants">
                  {results.restaurants.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        recentSearches.add(query);
                        setOpen(false);
                        router.push(`/restaurants/${r.id}`);
                      }}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      🍽️ {r.name} <span className="text-xs text-slate-400">— {r.city}</span>
                    </button>
                  ))}
                </ResultGroup>
              )}
              {results.products.length > 0 && (
                <ResultGroup title="Dishes">
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        recentSearches.add(query);
                        setOpen(false);
                        router.push(`/restaurants/${p.restaurantId}`);
                      }}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      🍴 {p.name} <span className="text-xs text-slate-400">— {p.restaurantName}</span>
                    </button>
                  ))}
                </ResultGroup>
              )}
              {results.categories.length > 0 && (
                <ResultGroup title="Categories">
                  {results.categories.map((c) => (
                    <span key={c.id} className="block px-2 py-1.5 text-sm text-slate-700">
                      🏷️ {c.name}
                    </span>
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-xs font-medium text-slate-400">{title}</p>
      {children}
    </div>
  );
}
