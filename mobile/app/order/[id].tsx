import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import { getErrorMessage } from "../../src/lib/errors";
import type { DeliveryAssignment, Order, Review } from "../../src/lib/types";
import { Button } from "../../src/components/ui/Button";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { StatusBadge } from "../../src/components/ui/StatusBadge";
import { StarRating } from "../../src/components/ui/StarRating";
import { TextField } from "../../src/components/ui/TextField";
import { LoadingView } from "../../src/components/ui/LoadingView";

interface InitiateResult {
  paymentId: string;
  gatewayOrderId: string;
  amount: string;
  currency: string;
}

function PaymentPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [initiating, setInitiating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<InitiateResult | null>(null);

  if (order.paymentStatus === "REFUNDED") {
    return (
      <View className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Text className="text-sm text-slate-700">↩ Refunded ₹{order.totalAmount} — cancelled after payment.</Text>
      </View>
    );
  }
  if (order.status === "CANCELLED") return null;
  if (order.paymentStatus === "PAID") {
    return (
      <View className="rounded-xl border border-green-200 bg-green-50 p-4">
        <Text className="text-sm text-green-800">✓ Payment received.</Text>
      </View>
    );
  }

  async function handleInitiate() {
    setError(null);
    setInitiating(true);
    try {
      setPending(await api.post<InitiateResult>(`/customer/me/orders/${order.id}/payment/initiate`));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInitiating(false);
    }
  }

  async function handleComplete(succeed: boolean) {
    if (!pending) return;
    setError(null);
    setCompleting(true);
    try {
      await api.post(`/customer/me/orders/${order.id}/payment/mock-complete`, { paymentId: pending.paymentId, succeed });
      setPending(null);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      onChanged();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <View className="gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-semibold text-slate-700">Payment</Text>
      {order.paymentStatus === "FAILED" && (
        <Text className="text-sm text-red-600">Your last payment attempt failed — please try again.</Text>
      )}
      {!pending ? (
        <Button loading={initiating} onPress={handleInitiate}>{`Pay ₹${order.totalAmount}`}</Button>
      ) : (
        <View className="gap-2">
          <View className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <Text className="text-xs text-slate-500">
              No real payment gateway is configured in this environment — this simulates the checkout
              step a customer would normally complete on the gateway&apos;s hosted page.
            </Text>
          </View>
          <Text className="text-sm text-slate-600">
            Gateway order {pending.gatewayOrderId} — ₹{pending.amount} {pending.currency}
          </Text>
          <View className="flex-row gap-2">
            <Button loading={completing} onPress={() => handleComplete(true)} className="flex-1">
              Simulate success
            </Button>
            <Button variant="secondary" loading={completing} onPress={() => handleComplete(false)} className="flex-1">
              Simulate failure
            </Button>
          </View>
        </View>
      )}
      <ErrorBanner message={error} />
    </View>
  );
}

const DELIVERY_STATUS_LABEL: Record<DeliveryAssignment["status"], string> = {
  ASSIGNED: "Waiting for your delivery partner to accept",
  ACCEPTED: "Your delivery partner is on the way to the restaurant",
  REJECTED: "Looking for another delivery partner",
  PICKED_UP: "Your order is on the way",
  DELIVERED: "Delivered",
};
const ACTIVE_DELIVERY_STATUSES: DeliveryAssignment["status"][] = ["ASSIGNED", "ACCEPTED", "PICKED_UP"];

function DeliveryPanel({ orderId }: { orderId: string }) {
  const { data: assignment, loading, reload } = useApiQuery(
    () => api.get<DeliveryAssignment | null>(`/customer/me/orders/${orderId}/delivery`),
    [orderId],
  );

  useEffect(() => {
    if (!assignment || !ACTIVE_DELIVERY_STATUSES.includes(assignment.status)) return;
    const timer = setInterval(reload, 15_000);
    return () => clearInterval(timer);
  }, [assignment, reload]);

  if (loading || !assignment) return null;

  return (
    <View className="gap-1 rounded-xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-700">Delivery</Text>
        <StatusBadge status={assignment.status as any} />
      </View>
      <Text className="text-sm text-slate-600">{DELIVERY_STATUS_LABEL[assignment.status]}</Text>
      {assignment.deliveryPartner && (
        <Text className="text-sm text-slate-500">
          Partner: {assignment.deliveryPartner.user.fullName}
          {assignment.deliveryPartner.user.phone ? ` · ${assignment.deliveryPartner.user.phone}` : ""}
        </Text>
      )}
      {ACTIVE_DELIVERY_STATUSES.includes(assignment.status) && assignment.distanceRemainingKm != null && (
        <Text className="text-sm font-medium text-orange-700">📍 {assignment.distanceRemainingKm} km away from you right now</Text>
      )}
      {assignment.status !== "DELIVERED" && assignment.status !== "REJECTED" && (
        <View className="mt-1 items-center rounded-lg border border-dashed border-orange-300 bg-orange-50 p-3">
          <Text className="text-xs text-orange-700">Share this code with your delivery partner to confirm handoff</Text>
          <Text className="mt-1 text-2xl font-bold tracking-widest text-orange-900">{assignment.deliveryOtp}</Text>
        </View>
      )}
    </View>
  );
}

function ReviewPanel({ orderId }: { orderId: string }) {
  const { data: reviews, loading, setData } = useApiQuery(() => api.get<Review[]>("/customer/me/reviews"));
  const existing = reviews?.find((r) => r.orderId === orderId) ?? null;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return null;

  async function submit() {
    setSaving(true);
    setSaveError(null);
    try {
      if (existing) {
        const updated = await api.patch<Review>(`/customer/me/reviews/${existing.id}`, { rating, comment: comment || undefined });
        setData((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.post<Review>("/customer/me/reviews", { orderId, rating, comment: comment || undefined });
        setData((prev) => [...(prev ?? []), created]);
      }
      setEditing(false);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <Text className="text-sm font-semibold text-slate-700">Your review</Text>
      {existing && !editing ? (
        <View>
          <StarRating rating={existing.rating} size={18} />
          {existing.comment && <Text className="mt-1 text-sm text-slate-600">{existing.comment}</Text>}
          {existing.restaurantResponse && (
            <View className="mt-2 rounded-lg bg-slate-50 p-3">
              <Text className="text-sm font-medium text-slate-700">Response from the restaurant</Text>
              <Text className="text-sm text-slate-600">{existing.restaurantResponse}</Text>
            </View>
          )}
          <Button variant="secondary" className="mt-2" onPress={() => setEditing(true)}>
            Edit review
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          <StarRating rating={rating} size={18} onChange={setRating} />
          <TextField label="Comment (optional)" value={comment} onChangeText={setComment} multiline placeholder="How was the food and delivery?" />
          <ErrorBanner message={saveError} />
          <View className="flex-row gap-2">
            <Button loading={saving} onPress={submit} className="flex-1">
              {existing ? "Save changes" : "Submit review"}
            </Button>
            {existing && (
              <Button variant="secondary" onPress={() => setEditing(false)} className="flex-1">
                Cancel
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading, error, reload } = useApiQuery(() => api.get<Order>(`/customer/me/orders/${id}`), [id]);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function doCancel() {
    setCancelError(null);
    setCancelling(true);
    try {
      await api.patch(`/customer/me/orders/${id}/cancel`, {});
      reload();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancel() {
    Alert.alert("Cancel order", "Cancel this order?", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: doCancel },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 p-4">
        <ErrorBanner message={error} />
        {order && (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-slate-900">{order.orderNumber}</Text>
              <StatusBadge status={order.status} />
            </View>
            <Text className="-mt-3 text-sm text-slate-500">Placed {new Date(order.createdAt).toLocaleString()}</Text>
            {order.cancellationReason && (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">Cancelled: {order.cancellationReason}</Text>
              </View>
            )}

            <View className="gap-2 rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm font-semibold text-slate-700">Items</Text>
              {order.items.map((item) => (
                <View key={item.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <Text className="font-medium text-slate-900">{item.productName}</Text>
                  {item.variantName && <Text className="text-sm text-slate-500">{item.variantName}</Text>}
                  {item.addons.length > 0 && (
                    <Text className="text-sm text-slate-500">+ {item.addons.map((a) => a.name).join(", ")}</Text>
                  )}
                  <Text className="text-sm text-slate-600">
                    ₹{item.unitPrice} × {item.quantity} = ₹{item.lineTotal}
                  </Text>
                </View>
              ))}
              <View className="gap-1 border-t border-slate-100 pt-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-600">Subtotal</Text>
                  <Text className="text-sm text-slate-600">₹{order.subtotal}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-600">
                    Delivery fee{order.deliveryDistanceKm ? ` (${order.deliveryDistanceKm} km)` : ""}
                  </Text>
                  <Text className="text-sm text-slate-600">{Number(order.deliveryFee) === 0 ? "Free" : `₹${order.deliveryFee}`}</Text>
                </View>
                {Number(order.discountAmount) > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-green-700">Coupon {order.couponCode}</Text>
                    <Text className="text-sm text-green-700">-₹{order.discountAmount}</Text>
                  </View>
                )}
                <View className="flex-row justify-between border-t border-slate-100 pt-1">
                  <Text className="font-semibold text-slate-900">Total</Text>
                  <Text className="font-semibold text-slate-900">₹{order.totalAmount}</Text>
                </View>
              </View>
            </View>

            <PaymentPanel order={order} onChanged={reload} />
            <DeliveryPanel orderId={id!} />

            <View className="gap-1 rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm font-semibold text-slate-700">Delivering to</Text>
              <Text className="text-sm text-slate-900">{order.deliveryReceiverName}</Text>
              <Text className="text-sm text-slate-500">{order.deliveryReceiverPhone}</Text>
              <Text className="text-sm text-slate-600">
                {order.deliveryAddressLine1}
                {order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ""}
              </Text>
              <Text className="text-sm text-slate-600">
                {order.deliveryCity}, {order.deliveryState} {order.deliveryPostalCode}
              </Text>
            </View>

            {order.status === "DELIVERED" && <ReviewPanel orderId={id!} />}

            <ErrorBanner message={cancelError} />
            {order.status === "PLACED" && (
              <Button variant="danger" loading={cancelling} onPress={confirmCancel}>
                Cancel order
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
