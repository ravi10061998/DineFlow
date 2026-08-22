import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import { getErrorMessage } from "../../src/lib/errors";
import type { MenuCategory, MenuProduct, PublicRestaurantDetail, Review } from "../../src/lib/types";
import { Button } from "../../src/components/ui/Button";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { StarRating } from "../../src/components/ui/StarRating";
import { StoreProductImage } from "../../src/components/StoreImage";

function ProductCard({ product, restaurantId }: { product: MenuProduct; restaurantId: string }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function handleAdd(replaceCart = false) {
    setError(null);
    setAdded(false);
    setAdding(true);
    try {
      await api.post("/customer/me/cart", {
        productId: product.id,
        variantId: variantId || undefined,
        addonIds: addonIds.length > 0 ? addonIds : undefined,
        quantity,
        replaceCart: replaceCart || undefined,
      });
      setAdded(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CART_DIFFERENT_RESTAURANT") {
        Alert.alert("Replace cart?", `${err.message}\n\nClear your cart and add this item instead?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Replace", style: "destructive", onPress: () => handleAdd(true) },
        ]);
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <View className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <View className="flex-row gap-3 p-4">
        <View className="flex-1 gap-1">
          <Text className={`font-semibold ${product.isAvailable ? "text-slate-900" : "text-slate-400"}`}>{product.name}</Text>
          {product.description && (
            <Text className="text-sm text-slate-500" numberOfLines={2}>
              {product.description}
            </Text>
          )}
          <Text className="text-sm font-semibold text-slate-900">₹{product.basePrice}</Text>
          {!product.isAvailable && (
            <Text className="self-start rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              Currently out of stock
            </Text>
          )}
        </View>
        <StoreProductImage
          restaurantId={restaurantId}
          productId={product.id}
          image={product.images[0]}
          className="h-24 w-24 rounded-lg"
        />
      </View>

      {product.isAvailable && (
        <View className="gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {product.variants.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {product.variants.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVariantId(v.id)}
                  className={`rounded-full border px-3 py-1 ${variantId === v.id ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}
                >
                  <Text className={`text-xs ${variantId === v.id ? "text-white" : "text-slate-600"}`}>
                    {v.name} (₹{v.price})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {product.addons.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {product.addons.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => toggleAddon(a.id)}
                  className={`rounded-full border px-3 py-1 ${addonIds.includes(a.id) ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}
                >
                  <Text className={`text-xs ${addonIds.includes(a.id) ? "text-white" : "text-slate-600"}`}>
                    + {a.name} (₹{a.price})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center rounded-md border border-slate-300 bg-white">
              <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1.5">
                <Text className="text-slate-600">−</Text>
              </Pressable>
              <Text className="px-3 text-sm">{quantity}</Text>
              <Pressable onPress={() => setQuantity((q) => Math.min(50, q + 1))} className="px-3 py-1.5">
                <Text className="text-slate-600">+</Text>
              </Pressable>
            </View>
            <Button loading={adding} onPress={() => handleAdd(false)}>
              Add to cart
            </Button>
            {added && <Text className="text-sm text-green-700">Added!</Text>}
          </View>
          <ErrorBanner message={error} />
        </View>
      )}
    </View>
  );
}

export default function RestaurantMenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: restaurant, loading: loadingRestaurant, error: restaurantError } = useApiQuery(
    () => api.get<PublicRestaurantDetail>(`/restaurants/${id}`),
    [id],
  );
  const { data: menu, loading: loadingMenu, error: menuError } = useApiQuery(
    () => api.get<MenuCategory[]>(`/restaurants/${id}/menu`),
    [id],
  );
  const { data: reviews } = useApiQuery(() => api.get<Review[]>(`/restaurants/${id}/reviews`), [id]);

  if (loadingRestaurant || loadingMenu) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <ScrollView contentContainerClassName="p-4">
        <ErrorBanner message={restaurantError ?? menuError} />

        {restaurant && (
          <View className="mb-4">
            <Text className="text-2xl font-bold text-slate-900">{restaurant.name}</Text>
            <Text className="text-sm text-slate-500">
              {restaurant.city}, {restaurant.state}
            </Text>
            {restaurant.reviewCount > 0 && (
              <View className="mt-1">
                <StarRating rating={restaurant.avgRating ?? 0} count={restaurant.reviewCount} />
              </View>
            )}
            {restaurant.description && <Text className="mt-2 text-sm text-slate-600">{restaurant.description}</Text>}
          </View>
        )}

        {menu?.map((category) => (
          <View key={category.id} className="mb-5">
            <Text className="mb-2 text-lg font-semibold text-slate-900">{category.name}</Text>
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} restaurantId={id!} />
            ))}
          </View>
        ))}

        {reviews && reviews.length > 0 && (
          <View className="mt-2">
            <Text className="mb-2 text-lg font-semibold text-slate-900">Reviews</Text>
            {reviews.map((r) => (
              <View key={r.id} className="mb-2 rounded-xl border border-slate-200 bg-white p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-slate-900">{r.customer?.fullName ?? "A customer"}</Text>
                  <StarRating rating={r.rating} />
                </View>
                {r.comment && <Text className="mt-1 text-sm text-slate-600">{r.comment}</Text>}
                {r.restaurantResponse && (
                  <View className="mt-2 rounded-lg bg-slate-50 p-2">
                    <Text className="text-xs font-medium text-slate-500">Restaurant response</Text>
                    <Text className="text-sm text-slate-700">{r.restaurantResponse}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
