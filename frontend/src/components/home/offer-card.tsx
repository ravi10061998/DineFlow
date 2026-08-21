"use client";

import { useState } from "react";
import type { Offer } from "@/lib/home-types";

/**
 * Display-only — copying a code here does not validate or apply it. Checkout
 * doesn't accept coupon codes yet (that's the original spec's own separate,
 * later Coupons module), so this deliberately doesn't pretend otherwise.
 */
export function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) — fail silently, code is still visible to copy by hand.
    }
  }

  const discount =
    offer.discountType === "PERCENTAGE" ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`;

  return (
    <div className="w-64 shrink-0 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4">
      <p className="text-sm font-semibold text-orange-900">{offer.title}</p>
      <p className="mt-0.5 text-lg font-bold text-orange-700">{discount}</p>
      {offer.description && <p className="mt-1 text-xs text-orange-800/80">{offer.description}</p>}
      {offer.minOrderAmount && (
        <p className="mt-1 text-xs text-orange-700/70">Min. order ₹{offer.minOrderAmount}</p>
      )}
      <button
        type="button"
        onClick={copyCode}
        className="mt-3 w-full rounded-md border border-orange-400 bg-white px-3 py-1.5 text-sm font-semibold tracking-wide text-orange-700 hover:bg-orange-100"
      >
        {copied ? "Copied!" : offer.code}
      </button>
    </div>
  );
}
