"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Cart } from "@/lib/cart-types";
import type { CustomerAddress } from "@/lib/address-types";
import type { Order } from "@/lib/order-types";
import type { DeliveryFeeEstimate } from "@/lib/delivery-fee-types";
import type { CouponPreview } from "@/lib/coupon-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { TextField } from "@/components/ui/text-field";

function CartPageContent() {
  const router = useRouter();
  const { data: cart, loading, error, reload } = useApiQuery(() => api.get<Cart>("/customer/me/cart"));
  const { data: addresses, error: addressesError } = useApiQuery(() => api.get<CustomerAddress[]>("/customer/me/addresses"));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<DeliveryFeeEstimate | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [appliedForSubtotal, setAppliedForSubtotal] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // The cart changed underneath an already-applied coupon (e.g. quantity/item edit) — the
  // discount was computed against a subtotal that's no longer current, so require re-applying
  // rather than silently showing a stale number.
  useEffect(() => {
    if (appliedCoupon && appliedForSubtotal !== null && cart?.subtotal !== appliedForSubtotal) {
      setAppliedCoupon(null);
      setAppliedForSubtotal(null);
      setCouponError("Your cart changed — please re-apply the coupon.");
    }
  }, [cart?.subtotal, appliedCoupon, appliedForSubtotal]);

  useEffect(() => {
    if (!selectedAddressId && addresses && addresses.length > 0) {
      setSelectedAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!selectedAddressId || !cart || cart.items.length === 0) {
      setFeeEstimate(null);
      return;
    }
    setFeeLoading(true);
    api
      .get<DeliveryFeeEstimate>(`/customer/me/orders/delivery-fee-preview?addressId=${selectedAddressId}`)
      .then(setFeeEstimate)
      .catch(() => setFeeEstimate(null)) // a failed estimate shouldn't block checkout — the real fee is still computed server-side there
      .finally(() => setFeeLoading(false));
  }, [selectedAddressId, cart]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponChecking(true);
    try {
      const preview = await api.get<CouponPreview>(`/customer/me/orders/coupon-preview?code=${encodeURIComponent(couponCode.trim())}`);
      setAppliedCoupon(preview);
      setAppliedForSubtotal(cart?.subtotal ?? null);
    } catch (err) {
      setAppliedCoupon(null);
      setAppliedForSubtotal(null);
      setCouponError(getErrorMessage(err));
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setAppliedForSubtotal(null);
    setCouponCode("");
    setCouponError(null);
  }

  async function handleCheckout() {
    if (!selectedAddressId) return;
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      const result = await api.post<Order>("/customer/me/orders/checkout", {
        deliveryAddressId: selectedAddressId,
        couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
      });
      router.push(`/orders/${result.id}`);
    } catch (err) {
      setCheckoutError(getErrorMessage(err));
      reload(); // in case the cart changed underneath (e.g. an item became unavailable)
    } finally {
      setCheckingOut(false);
    }
  }

  async function updateQuantity(id: string, quantity: number) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.patch(`/customer/me/cart/${id}`, { quantity });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.delete(`/customer/me/cart/${id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function clearCart() {
    if (!window.confirm("Clear your entire cart?")) return;
    setActionError(null);
    try {
      await api.delete("/customer/me/cart");
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/restaurants" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          Browse restaurants
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Your Cart</h1>
        {cart?.restaurantName && <p className="mt-1 text-sm text-slate-500">Ordering from {cart.restaurantName}</p>}

        <ErrorBanner message={error ?? actionError} />

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : cart?.items.length === 0 ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-400">Your cart is empty.</p>
            <Link href="/restaurants" className="mt-3 inline-block font-medium text-slate-900 underline">
              Browse restaurants
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <ul className="space-y-2">
              {cart?.items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-medium ${item.isAvailable ? "text-slate-900" : "text-red-600"}`}>{item.productName}</p>
                      {item.variantName && <p className="text-sm text-slate-500">{item.variantName}</p>}
                      {item.addons.length > 0 && <p className="text-sm text-slate-500">+ {item.addons.map((a) => a.name).join(", ")}</p>}
                      {!item.isAvailable && <p className="text-xs text-red-600">No longer available — please remove this item.</p>}
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        ₹{item.unitPrice} × {item.quantity} = ₹{item.lineTotal}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center rounded-md border border-slate-300">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="px-3 text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => updateQuantity(item.id, Math.min(50, item.quantity + 1))}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <Button variant="danger" loading={busyId === item.id} onClick={() => removeItem(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{cart?.subtotal}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Delivery fee
                  {feeEstimate?.distanceKm && <span className="text-xs text-slate-400"> ({feeEstimate.distanceKm} km)</span>}
                </span>
                <span>
                  {feeLoading ? "…" : feeEstimate ? (Number(feeEstimate.fee) === 0 ? "Free" : `₹${feeEstimate.fee}`) : "Estimated at checkout"}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-green-700">
                  <span>Coupon {appliedCoupon.coupon.code}</span>
                  <span>-₹{appliedCoupon.discountAmount}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-lg font-semibold text-slate-900">
                <span>Total</span>
                <span>
                  ₹{(Number(cart?.subtotal ?? 0) + Number(feeEstimate?.fee ?? 0) - Number(appliedCoupon?.discountAmount ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-700">
                    Coupon <span className="font-mono font-semibold">{appliedCoupon.coupon.code}</span> applied.
                  </p>
                  <Button variant="secondary" onClick={removeCoupon}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      label="Have a coupon code?"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. DINE50"
                    />
                  </div>
                  <Button variant="secondary" loading={couponChecking} disabled={!couponCode.trim()} onClick={applyCoupon}>
                    Apply
                  </Button>
                </div>
              )}
              <ErrorBanner message={couponError} />
            </div>

            <ErrorBanner message={addressesError} />
            {addresses?.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Add a delivery address in{" "}
                <Link href="/profile" className="font-medium underline">
                  your profile
                </Link>{" "}
                before checking out.
              </div>
            ) : (
              <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
                <label htmlFor="delivery-address" className="text-sm font-medium text-slate-700">
                  Deliver to
                </label>
                <select
                  id="delivery-address"
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                >
                  {addresses?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.addressLine1}, {a.city}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <ErrorBanner message={checkoutError} />

            <div className="flex gap-2">
              <Button variant="secondary" onClick={clearCart}>
                Clear cart
              </Button>
              <Button
                loading={checkingOut}
                disabled={!selectedAddressId || cart?.items.some((i) => !i.isAvailable)}
                onClick={handleCheckout}
              >
                Place order
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <RequireAuth roles={["CUSTOMER"]}>
      <CartPageContent />
    </RequireAuth>
  );
}
