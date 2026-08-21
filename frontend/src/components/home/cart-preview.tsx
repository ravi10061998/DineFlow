"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { Cart } from "@/lib/cart-types";

export function CartPreview() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const enabled = user?.role === "CUSTOMER";

  useEffect(() => {
    if (!enabled) return;
    api
      .get<Cart>("/customer/me/cart")
      .then(setCart)
      .catch(() => setError("Couldn't load your cart."));
  }, [enabled]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!enabled) return null;

  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cart"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-slate-100"
      >
        🛒
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-semibold text-white">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">Your Cart</p>
          {error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : !cart ? (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          ) : cart.items.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Your cart is empty.</p>
          ) : (
            <>
              <ul className="max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between border-b border-slate-50 px-4 py-2 text-sm last:border-b-0">
                    <span className="truncate text-slate-700">
                      {item.quantity}× {item.productName}
                    </span>
                    <span className="font-medium text-slate-900">₹{item.lineTotal}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-900">
                <span>Subtotal</span>
                <span>₹{cart.subtotal}</span>
              </div>
            </>
          )}
          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-orange-600 hover:bg-orange-50"
          >
            View cart →
          </Link>
        </div>
      )}
    </div>
  );
}
