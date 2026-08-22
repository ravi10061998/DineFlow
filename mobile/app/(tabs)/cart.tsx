import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import { getErrorMessage } from "../../src/lib/errors";
import type { Cart, CartLine, CouponPreview, CustomerAddress, DeliveryFeeEstimate, Order } from "../../src/lib/types";
import { Button } from "../../src/components/ui/Button";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { TextField } from "../../src/components/ui/TextField";
import { LoadingView } from "../../src/components/ui/LoadingView";

function CartLineRow({ line, busy, onQuantityChange, onRemove }: {
  line: CartLine;
  busy: boolean;
  onQuantityChange: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <View className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
      <Text className={`font-semibold ${line.isAvailable ? "text-slate-900" : "text-red-600"}`}>{line.productName}</Text>
      {line.variantName && <Text className="text-sm text-slate-500">{line.variantName}</Text>}
      {line.addons.length > 0 && (
        <Text className="text-sm text-slate-500">+ {line.addons.map((a) => a.name).join(", ")}</Text>
      )}
      {!line.isAvailable && <Text className="text-xs text-red-600">No longer available — please remove this item.</Text>}
      <Text className="mt-1 text-sm font-semibold text-slate-700">
        ₹{line.unitPrice} × {line.quantity} = ₹{line.lineTotal}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center rounded-md border border-slate-300">
          <Pressable
            disabled={busy}
            onPress={() => onQuantityChange(Math.max(1, line.quantity - 1))}
            className="px-3 py-1.5"
          >
            <Text className="text-slate-600">−</Text>
          </Pressable>
          <Text className="px-3 text-sm">{line.quantity}</Text>
          <Pressable
            disabled={busy}
            onPress={() => onQuantityChange(Math.min(50, line.quantity + 1))}
            className="px-3 py-1.5"
          >
            <Text className="text-slate-600">+</Text>
          </Pressable>
        </View>
        <Pressable disabled={busy} onPress={onRemove}>
          <Text className="text-sm font-medium text-red-600">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { data: cart, loading, error, reload } = useApiQuery(() => api.get<Cart>("/customer/me/cart"));
  const { data: addresses, error: addressesError } = useApiQuery(() =>
    api.get<CustomerAddress[]>("/customer/me/addresses"),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<DeliveryFeeEstimate | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [appliedForSubtotal, setAppliedForSubtotal] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

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
    api
      .get<DeliveryFeeEstimate>(`/customer/me/orders/delivery-fee-preview?addressId=${selectedAddressId}`)
      .then(setFeeEstimate)
      .catch(() => setFeeEstimate(null));
  }, [selectedAddressId, cart]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponChecking(true);
    try {
      const preview = await api.get<CouponPreview>(
        `/customer/me/orders/coupon-preview?code=${encodeURIComponent(couponCode.trim())}`,
      );
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
      router.push(`/order/${result.id}`);
    } catch (err) {
      setCheckoutError(getErrorMessage(err));
      reload();
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

  function confirmClear() {
    Alert.alert("Clear cart", "Clear your entire cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete("/customer/me/cart");
            reload();
          } catch (err) {
            setActionError(getErrorMessage(err));
          }
        },
      },
    ]);
  }

  const total =
    Number(cart?.subtotal ?? 0) + Number(feeEstimate?.fee ?? 0) - Number(appliedCoupon?.discountAmount ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="border-b border-slate-200 bg-white px-5 py-4">
        <Text className="text-xl font-bold text-slate-900">Your cart</Text>
        {cart?.restaurantName && <Text className="text-sm text-slate-500">Ordering from {cart.restaurantName}</Text>}
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error ?? actionError} />

          {!cart || cart.items.length === 0 ? (
            <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-8">
              <Text className="text-slate-400">Your cart is empty.</Text>
              <Button variant="secondary" className="mt-4" onPress={() => router.push("/(tabs)")}>
                Browse restaurants
              </Button>
            </View>
          ) : (
            <View className="mt-2">
              <FlatList
                data={cart.items}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <CartLineRow
                    line={item}
                    busy={busyId === item.id}
                    onQuantityChange={(q) => updateQuantity(item.id, q)}
                    onRemove={() => removeItem(item.id)}
                  />
                )}
              />

              <View className="gap-1.5 rounded-xl border border-slate-200 bg-white p-4">
                <View className="flex-row justify-between">
                  <Text className="text-slate-600">Subtotal</Text>
                  <Text className="text-slate-600">₹{cart.subtotal}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-600">
                    Delivery fee{feeEstimate?.distanceKm ? ` (${feeEstimate.distanceKm} km)` : ""}
                  </Text>
                  <Text className="text-slate-600">
                    {feeEstimate ? (Number(feeEstimate.fee) === 0 ? "Free" : `₹${feeEstimate.fee}`) : "Estimated at checkout"}
                  </Text>
                </View>
                {appliedCoupon && (
                  <View className="flex-row justify-between">
                    <Text className="text-green-700">Coupon {appliedCoupon.coupon.code}</Text>
                    <Text className="text-green-700">-₹{appliedCoupon.discountAmount}</Text>
                  </View>
                )}
                <View className="flex-row justify-between border-t border-slate-100 pt-1.5">
                  <Text className="text-lg font-semibold text-slate-900">Total</Text>
                  <Text className="text-lg font-semibold text-slate-900">₹{total.toFixed(2)}</Text>
                </View>
              </View>

              <View className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                {appliedCoupon ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-green-700">
                      Coupon <Text className="font-mono font-semibold">{appliedCoupon.coupon.code}</Text> applied.
                    </Text>
                    <Pressable onPress={removeCoupon}>
                      <Text className="text-sm font-medium text-slate-900">Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row items-end gap-2">
                    <View className="flex-1">
                      <TextField
                        label="Have a coupon code?"
                        autoCapitalize="characters"
                        value={couponCode}
                        onChangeText={setCouponCode}
                        placeholder="e.g. DINE50"
                      />
                    </View>
                    <Button variant="secondary" loading={couponChecking} disabled={!couponCode.trim()} onPress={applyCoupon}>
                      Apply
                    </Button>
                  </View>
                )}
                <ErrorBanner message={couponError} />
              </View>

              <ErrorBanner message={addressesError} />
              {addresses?.length === 0 ? (
                <View className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Text className="text-sm text-amber-800">Add a delivery address before checking out.</Text>
                  <Button variant="secondary" className="mt-3" onPress={() => router.push("/addresses")}>
                    Add address
                  </Button>
                </View>
              ) : (
                <View className="mt-4 gap-2 rounded-xl border border-slate-200 bg-white p-4">
                  <Text className="text-sm font-medium text-slate-700">Deliver to</Text>
                  {addresses?.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => setSelectedAddressId(a.id)}
                      className={`rounded-lg border p-3 ${selectedAddressId === a.id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                    >
                      <Text className="text-sm font-medium text-slate-900">{a.label}</Text>
                      <Text className="text-xs text-slate-500">
                        {a.addressLine1}, {a.city}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <ErrorBanner message={checkoutError} />

              <View className="mt-4 flex-row gap-2">
                <Button variant="secondary" onPress={confirmClear} className="flex-1">
                  Clear cart
                </Button>
                <Button
                  loading={checkingOut}
                  disabled={!selectedAddressId || cart.items.some((i) => !i.isAvailable)}
                  onPress={handleCheckout}
                  className="flex-1"
                >
                  Place order
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
