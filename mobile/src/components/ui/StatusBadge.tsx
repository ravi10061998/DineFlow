import { Text, View } from "react-native";
import type { OrderStatus } from "../../lib/types";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  PLACED: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-indigo-50 text-indigo-700",
  PREPARING: "bg-amber-50 text-amber-700",
  READY: "bg-purple-50 text-purple-700",
  OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const classes = STATUS_CLASSES[status] ?? "bg-slate-100 text-slate-700";
  const [bg, text] = classes.split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{status.replace(/_/g, " ")}</Text>
    </View>
  );
}
