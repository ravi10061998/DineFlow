import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import type { PublicRestaurant } from "../../src/lib/types";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { StarRating } from "../../src/components/ui/StarRating";
import { RestaurantLogoImage } from "../../src/components/StoreImage";

function RestaurantCard({ restaurant, onPress }: { restaurant: PublicRestaurant; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-xl border border-slate-200 bg-white p-3 active:opacity-80"
    >
      <RestaurantLogoImage restaurantId={restaurant.id} hasLogo={restaurant.hasLogo} className="h-16 w-16 rounded-lg" />
      <View className="flex-1 justify-center gap-1">
        <Text className="text-base font-semibold text-slate-900">{restaurant.name}</Text>
        <Text className="text-sm text-slate-500">
          {restaurant.city}, {restaurant.state}
        </Text>
        {restaurant.reviewCount > 0 && <StarRating rating={restaurant.avgRating ?? 0} count={restaurant.reviewCount} />}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: restaurants, loading, error, reload, refreshing } = useApiQuery(() =>
    api.get<PublicRestaurant[]>("/restaurants"),
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="border-b border-slate-200 bg-white px-5 py-4">
        <Text className="text-xl font-bold text-slate-900">🍽️ DineFlow</Text>
        <Text className="text-sm text-slate-500">Restaurants near you</Text>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={restaurants ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
          ListHeaderComponent={<ErrorBanner message={error} />}
          ListEmptyComponent={
            <Text className="mt-10 text-center text-slate-400">No restaurants available yet.</Text>
          }
          renderItem={({ item }) => (
            <RestaurantCard restaurant={item} onPress={() => router.push(`/restaurant/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
