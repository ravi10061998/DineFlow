import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import type { Order } from "../../src/lib/types";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { StatusBadge } from "../../src/components/ui/StatusBadge";

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl border border-slate-200 bg-white p-4 active:opacity-80">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-slate-900">#{order.orderNumber}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text className="mt-1 text-sm text-slate-500">
        {order.items.length} item{order.items.length === 1 ? "" : "s"} · ₹{order.totalAmount}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</Text>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { data: orders, loading, error, reload, refreshing } = useApiQuery(() =>
    api.get<Order[]>("/customer/me/orders"),
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="border-b border-slate-200 bg-white px-5 py-4">
        <Text className="text-xl font-bold text-slate-900">Your orders</Text>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
          ListHeaderComponent={<ErrorBanner message={error} />}
          ListEmptyComponent={<Text className="mt-10 text-center text-slate-400">No orders yet.</Text>}
          renderItem={({ item }) => <OrderRow order={item} onPress={() => router.push(`/order/${item.id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}
