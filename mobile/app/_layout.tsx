import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="restaurant/[id]" options={{ headerShown: true, title: "Menu" }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: true, title: "Order" }} />
          <Stack.Screen name="addresses" options={{ headerShown: true, title: "Delivery addresses" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
