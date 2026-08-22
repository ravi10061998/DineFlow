import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import type { AppNotification, HomeFeed, Offer, PublicRestaurant, StoreProduct, StoreRestaurant } from "../../src/lib/types";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { StarRating } from "../../src/components/ui/StarRating";
import { RemoteImage, RestaurantLogoImage, StoreProductImage } from "../../src/components/StoreImage";
import { FavoriteButton } from "../../src/components/FavoriteButton";

function SectionHeader({ title }: { title: string }) {
  return <Text className="mb-2 px-4 text-lg font-semibold text-slate-900">{title}</Text>;
}

function HorizontalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <SectionHeader title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
        {children}
      </ScrollView>
    </View>
  );
}

function RestaurantChip({ restaurant, onPress }: { restaurant: StoreRestaurant; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-40 overflow-hidden rounded-xl border border-slate-200 bg-white active:opacity-80">
      <View>
        <RestaurantLogoImage restaurantId={restaurant.id} hasLogo={restaurant.hasLogo} className="h-24 w-40" />
        <View className="absolute top-1.5 right-1.5">
          <FavoriteButton targetType="RESTAURANT" targetId={restaurant.id} />
        </View>
      </View>
      <View className="gap-0.5 p-2.5">
        <Text className="font-semibold text-slate-900" numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text className="text-xs text-slate-500" numberOfLines={1}>
          {restaurant.city}, {restaurant.state}
        </Text>
        {restaurant.reviewCount > 0 && <StarRating rating={restaurant.avgRating ?? 0} count={restaurant.reviewCount} size={11} />}
      </View>
    </Pressable>
  );
}

function ProductChip({ product, onPress }: { product: StoreProduct; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-32 overflow-hidden rounded-xl border border-slate-200 bg-white active:opacity-80">
      <StoreProductImage restaurantId={product.restaurantId} productId={product.id} image={product.images[0]} className="h-24 w-32" />
      <View className="gap-0.5 p-2">
        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="text-xs text-slate-500" numberOfLines={1}>
          {product.restaurantName}
        </Text>
        <Text className="text-xs font-semibold text-slate-700">₹{product.basePrice}</Text>
      </View>
    </Pressable>
  );
}

function OfferChip({ offer }: { offer: Offer }) {
  const discount = offer.discountType === "PERCENTAGE" ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`;
  return (
    <View className="w-56 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3">
      <Text className="text-sm font-semibold text-orange-900">{offer.title}</Text>
      <Text className="mt-0.5 text-lg font-bold text-orange-700">{discount}</Text>
      {offer.minOrderAmount && <Text className="mt-1 text-xs text-orange-700/70">Min. order ₹{offer.minOrderAmount}</Text>}
      <View className="mt-2 rounded-md border border-orange-400 bg-white px-2 py-1 self-start">
        <Text className="text-xs font-semibold tracking-wide text-orange-700">{offer.code}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: feed, loading: feedLoading, error: feedError, reload: reloadFeed, refreshing } = useApiQuery(() =>
    api.get<HomeFeed>("/store/home"),
  );
  const { data: notifications } = useApiQuery(() => api.get<AppNotification[]>("/customer/me/notifications"));
  const { data: allRestaurants, loading: allLoading } = useApiQuery(() => api.get<PublicRestaurant[]>("/restaurants"));

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (feedLoading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <View>
          <Text className="text-xl font-bold text-slate-900">🍽️ DineFlow</Text>
          <Text className="text-sm text-slate-500">Restaurants near you</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} className="relative h-10 w-10 items-center justify-center rounded-full active:bg-slate-100">
          <Text style={{ fontSize: 20 }}>🔔</Text>
          {unreadCount > 0 && (
            <View className="absolute top-1 right-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1">
              <Text className="text-[10px] font-semibold text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadFeed} />}>
        <ErrorBanner message={feedError} />

        {feed && feed.banners.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="mb-5">
            {feed.banners.map((b) => (
              <View key={b.id} style={{ width: 390 }} className="px-4">
                <RemoteImage src={b.imageUrl} className="h-36 w-full rounded-xl" />
                <Text className="mt-1 font-semibold text-slate-900">{b.title}</Text>
                {b.subtitle && <Text className="text-xs text-slate-500">{b.subtitle}</Text>}
              </View>
            ))}
          </ScrollView>
        )}

        {feed && feed.categories.length > 0 && (
          <View className="mb-5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-4">
              {feed.categories.map((cat) => (
                <View key={cat.id} className="w-16 items-center gap-1.5">
                  <RemoteImage src={cat.imageUrl} className="h-14 w-14 rounded-full" />
                  <Text className="text-xs text-slate-600" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {feed && feed.offers.length > 0 && (
          <HorizontalSection title="Offers for you">
            {feed.offers.map((o) => (
              <OfferChip key={o.id} offer={o} />
            ))}
          </HorizontalSection>
        )}

        {feed && feed.featuredRestaurants.length > 0 && (
          <HorizontalSection title="Featured restaurants">
            {feed.featuredRestaurants.map((r) => (
              <RestaurantChip key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}`)} />
            ))}
          </HorizontalSection>
        )}

        {feed && feed.popularRestaurants.length > 0 && (
          <HorizontalSection title="Popular near everyone">
            {feed.popularRestaurants.map((r) => (
              <RestaurantChip key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}`)} />
            ))}
          </HorizontalSection>
        )}

        {feed && feed.popularProducts.length > 0 && (
          <HorizontalSection title="Popular dishes">
            {feed.popularProducts.map((p) => (
              <ProductChip key={p.id} product={p} onPress={() => router.push(`/restaurant/${p.restaurantId}`)} />
            ))}
          </HorizontalSection>
        )}

        <View className="mb-6">
          <SectionHeader title="All restaurants" />
          {allLoading ? (
            <Text className="px-4 text-sm text-slate-400">Loading…</Text>
          ) : allRestaurants?.length === 0 ? (
            <Text className="px-4 text-sm text-slate-400">No restaurants available yet.</Text>
          ) : (
            <View className="gap-3 px-4">
              {allRestaurants?.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/restaurant/${r.id}`)}
                  className="flex-row gap-3 rounded-xl border border-slate-200 bg-white p-3 active:opacity-80"
                >
                  <RestaurantLogoImage restaurantId={r.id} hasLogo={r.hasLogo} className="h-16 w-16 rounded-lg" />
                  <View className="flex-1 justify-center gap-1">
                    <Text className="text-base font-semibold text-slate-900">{r.name}</Text>
                    <Text className="text-sm text-slate-500">
                      {r.city}, {r.state}
                    </Text>
                    {r.reviewCount > 0 && <StarRating rating={r.avgRating ?? 0} count={r.reviewCount} />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
