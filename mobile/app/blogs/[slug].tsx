import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api-client";
import { useApiQuery } from "../../src/lib/use-api-query";
import type { Blog } from "../../src/lib/types";
import { ErrorBanner } from "../../src/components/ui/ErrorBanner";
import { LoadingView } from "../../src/components/ui/LoadingView";
import { RemoteImage } from "../../src/components/StoreImage";

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: blog, loading, error } = useApiQuery(() => api.get<Blog>(`/store/blogs/${slug}`), [slug]);

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <ScrollView contentContainerClassName="pb-8">
        <ErrorBanner message={error} />
        {blog && (
          <>
            <RemoteImage src={blog.coverImageUrl} emoji="📰" className="h-48 w-full" />
            <View className="gap-2 p-4">
              {blog.category && (
                <View className="self-start rounded-full bg-slate-100 px-2.5 py-1">
                  <Text className="text-xs font-medium text-slate-600">{blog.category.name}</Text>
                </View>
              )}
              <Text className="text-2xl font-bold text-slate-900">{blog.title}</Text>
              <Text className="text-sm text-slate-500">
                By {blog.authorName} · {blog.readingTimeMinutes} min read
              </Text>
              <Text className="mt-2 text-base leading-relaxed text-slate-700">{blog.content}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
