import { Pressable, Text, View } from "react-native";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
  /** When provided, renders as an interactive picker instead of a read-only display. */
  onChange?: (value: number) => void;
}

export function StarRating({ rating, count, size = 14, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View className="flex-row items-center gap-0.5">
      {stars.map((n) =>
        onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
            <Text style={{ fontSize: size + 8 }} className={n <= rating ? "text-amber-500" : "text-slate-300"}>
              ★
            </Text>
          </Pressable>
        ) : (
          <Text key={n} style={{ fontSize: size }} className={n <= Math.round(rating) ? "text-amber-500" : "text-slate-300"}>
            ★
          </Text>
        ),
      )}
      {count !== undefined && <Text className="ml-1 text-xs text-slate-500">({count})</Text>}
    </View>
  );
}
