import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/lib/api-client";
import { useApiQuery } from "../src/lib/use-api-query";
import type { AppNotification } from "../src/lib/types";
import { ErrorBanner } from "../src/components/ui/ErrorBanner";
import { LoadingView } from "../src/components/ui/LoadingView";

export default function NotificationsScreen() {
  const { data: notifications, loading, error, setData } = useApiQuery(() =>
    api.get<AppNotification[]>("/customer/me/notifications"),
  );

  async function markRead(id: string) {
    setData((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? prev);
    try {
      await api.patch(`/customer/me/notifications/${id}/read`);
    } catch {
      // Best-effort — a failed mark-as-read just means it still shows unread next load.
    }
  }

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4"
        ListHeaderComponent={<ErrorBanner message={error} />}
        ListEmptyComponent={<Text className="mt-10 text-center text-slate-400">No notifications yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => markRead(item.id)}
            className={`mb-2 rounded-xl border border-slate-200 p-3.5 ${item.isRead ? "bg-white" : "bg-orange-50"}`}
          >
            <Text className="text-sm font-medium text-slate-900">{item.title}</Text>
            <Text className="mt-0.5 text-xs text-slate-500">{item.body}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
