"use client";

import { useState } from "react";
import { locationStore, type DeliveryLocation } from "@/lib/location-store";

/**
 * Only "use my current location" produces real coordinates (needed for the nearby-restaurants
 * query). There's no geocoding service wired up, so a manually-typed address becomes a label
 * only — it can't unlock "nearby" results, and the UI says so rather than pretending otherwise.
 */
export function LocationSelector({ onLocationChange }: { onLocationChange: (location: DeliveryLocation | null) => void }) {
  const [open, setOpen] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<DeliveryLocation | null>(() => locationStore.get());

  async function useCurrentLocation() {
    setBusy(true);
    setError(null);
    try {
      const { lat, lng } = await locationStore.requestBrowserLocation();
      const location: DeliveryLocation = { label: `Current location (${lat.toFixed(3)}, ${lng.toFixed(3)})`, lat, lng };
      locationStore.set(location);
      setCurrent(location);
      onLocationChange(location);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location.");
    } finally {
      setBusy(false);
    }
  }

  function saveManualLabel() {
    if (!manualLabel.trim()) return;
    // Label-only: no coordinates, so this intentionally doesn't feed the nearby-restaurants query.
    locationStore.clear();
    setCurrent(null);
    onLocationChange(null);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[10rem] items-center gap-1 truncate text-sm font-medium text-slate-700 hover:text-slate-900 sm:max-w-[16rem]"
      >
        📍 <span className="truncate">{current?.label ?? manualLabel ?? "Set delivery location"}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "Locating…" : "📍 Use my current location"}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="my-3 flex items-center gap-2 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" /> or type a label <div className="h-px flex-1 bg-slate-200" />
          </div>

          <input
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            placeholder="e.g. Home, Office"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-400">A typed label won&apos;t unlock nearby restaurants — only your current location can.</p>
          <button
            type="button"
            onClick={saveManualLabel}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save label
          </button>
        </div>
      )}
    </div>
  );
}
