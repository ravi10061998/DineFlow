"use client";

export interface DeliveryLocation {
  label: string;
  lat: number;
  lng: number;
}

const STORAGE_KEY = "df_delivery_location";

/**
 * Plain localStorage-backed store, not tied to auth — a customer should be
 * able to pick a delivery location and browse nearby restaurants before
 * ever logging in. Mirrors auth-store.ts's own "plain singleton read
 * directly by consumers" shape rather than introducing a second pattern.
 */
export const locationStore = {
  get(): DeliveryLocation | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DeliveryLocation) : null;
    } catch {
      return null;
    }
  },

  set(location: DeliveryLocation): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Wraps the browser Geolocation API — rejects on denial/unsupported rather than throwing synchronously. */
  requestBrowserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Location isn't supported in this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => reject(new Error("Location permission was denied.")),
        { timeout: 10000 },
      );
    });
  },
};
