import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/lib/auth-context";
import { Button } from "../../src/components/ui/Button";

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between border-b border-slate-100 py-4 active:opacity-60">
      <Text className="text-base text-slate-900">{label}</Text>
      <Text className="text-slate-400">›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: handleLogout },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ScrollView contentContainerClassName="p-5">
        <View className="rounded-xl border border-slate-200 bg-white p-5">
          <Text className="text-lg font-semibold text-slate-900">{user?.fullName}</Text>
          <Text className="text-sm text-slate-500">{user?.email}</Text>
          {user?.phone && <Text className="text-sm text-slate-500">{user.phone}</Text>}
        </View>

        <View className="mt-4 rounded-xl border border-slate-200 bg-white px-5">
          <MenuRow label="Delivery addresses" onPress={() => router.push("/addresses")} />
        </View>

        <Button variant="secondary" loading={loggingOut} onPress={confirmLogout} className="mt-6">
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
