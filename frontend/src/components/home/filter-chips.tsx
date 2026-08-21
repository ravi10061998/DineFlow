"use client";

const FILTERS = [
  { key: "featured", label: "⭐ Featured" },
  { key: "nearby", label: "📍 Nearby" },
  { key: "offers", label: "🏷️ With offers" },
] as const;

export type QuickFilterKey = (typeof FILTERS)[number]["key"];

/** Client-side toggles over sections already on the page — not a separate filtered search. */
export function FilterChips({ active, onToggle }: { active: QuickFilterKey[]; onToggle: (key: QuickFilterKey) => void }) {
  return (
    <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
      {FILTERS.map((f) => {
        const isActive = active.includes(f.key);
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onToggle(f.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              isActive
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
