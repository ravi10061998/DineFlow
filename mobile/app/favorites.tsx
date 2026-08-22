import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/lib/api-client";
import { useApiQuery } from "../src/lib/use-api-query";
import { getErrorMessage } from "../src/lib/errors";
import type { Favorite } from "../src/lib/types";
import { Button } from "../src/components/ui/Button";
import { ErrorBanner } from "../src/components/ui/ErrorBanner";
import { LoadingView } from "../src/components/ui/LoadingView";

export default function FavoritesScreen() {
  const router = useRouter();
  const { data: favorites, loading, error, reload } = useApiQuery(() => api.get<Favorite[]>("/customer/me/favorites"));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.delete(`/customer/me/favorites/${id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <FlatList
        data={favorites ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4"
        ListHeaderComponent={<ErrorBanner message={error ?? actionError} />}
        ListEmptyComponent={<Text className="mt-10 text-center text-slate-400">No favorites yet — tap the heart on a restaurant or dish.</Text>}
        renderItem={({ item }) => {
          const label = item.restaurant?.name ?? item.product?.name ?? "Unknown";
          const sublabel = item.restaurant ? item.restaurant.city : item.product ? `₹${item.product.basePrice}` : "";
          return (
            <Pressable
              onPress={() => item.restaurant && router.push(`/restaurant/${item.restaurant.id}`)}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-4 active:opacity-80"
            >
              <View>
                <Text className="font-medium text-slate-900">{label}</Text>
                <Text className="text-sm text-slate-500">{sublabel}</Text>
              </View>
              <Button variant="danger" loading={busyId === item.id} onPress={() => remove(item.id)}>
                Remove
              </Button>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
