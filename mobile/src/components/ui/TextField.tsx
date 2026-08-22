import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, className, ...props }: TextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        className={`rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 ${className ?? ""}`}
        {...props}
      />
    </View>
  );
}
