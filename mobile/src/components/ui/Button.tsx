import { ActivityIndicator, Pressable, Text, type GestureResponderEvent } from "react-native";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps {
  children: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-slate-900 active:bg-slate-800",
  secondary: "bg-white border border-slate-300 active:bg-slate-50",
  danger: "bg-red-600 active:bg-red-700",
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-slate-900",
  danger: "text-white",
};

export function Button({ children, onPress, variant = "primary", loading, disabled, className }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-lg px-4 py-3 ${VARIANT_CLASSES[variant]} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#0f172a" : "#ffffff"} />
      ) : (
        <Text className={`text-sm font-semibold ${VARIANT_TEXT_CLASSES[variant]}`}>{children}</Text>
      )}
    </Pressable>
  );
}
