import { useState } from "react";
import { Image, Text, View } from "react-native";
import { API_URL } from "../lib/config";

// Product photos and restaurant logos are both served publicly (see frontend's
// components/home/store-image.tsx for the same reasoning) — no Authorization header needed,
// so a plain <Image source={{uri}}> works here exactly like a plain <img> does on web.

function Fallback({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <View className={`items-center justify-center bg-amber-100 ${className ?? ""}`}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
}

export function StoreProductImage({
  restaurantId,
  productId,
  image,
  className,
}: {
  restaurantId: string;
  productId: string;
  image: { id: string } | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <Fallback emoji="🍴" className={className} />;
  const uri = `${API_URL}/restaurants/${restaurantId}/menu/products/${productId}/images/${image.id}/file`;
  return <Image source={{ uri }} onError={() => setFailed(true)} className={className} />;
}

/** Banners and food categories store an admin-provided absolute image URL directly. */
export function RemoteImage({ src, emoji = "🍽️", className }: { src: string | null; emoji?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Fallback emoji={emoji} className={className} />;
  return <Image source={{ uri: src }} onError={() => setFailed(true)} className={className} />;
}

export function RestaurantLogoImage({
  restaurantId,
  hasLogo,
  className,
}: {
  restaurantId: string;
  hasLogo: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!hasLogo || failed) return <Fallback emoji="🍽️" className={className} />;
  const uri = `${API_URL}/restaurants/${restaurantId}/logo`;
  return <Image source={{ uri }} onError={() => setFailed(true)} className={className} />;
}
