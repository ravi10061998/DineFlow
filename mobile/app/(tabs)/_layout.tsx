import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../src/lib/auth-context";
import { LoadingView } from "../../src/components/ui/LoadingView";

// Scope decision (mirrors this session's "flag simplifications" pattern): unlike the web
// storefront, which lets an anonymous visitor browse before logging in, the mobile app gates
// everything behind auth up front — a simpler mobile-native flow, and every tab here needs a
// customer session anyway (Cart/Orders/Profile) except Home, which isn't worth splitting off.
export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#0f172a", headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Browse", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }}
      />
      <Tabs.Screen
        name="cart"
        options={{ title: "Cart", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📦</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }}
      />
    </Tabs>
  );
}
