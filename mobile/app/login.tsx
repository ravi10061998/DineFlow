import { useState } from "react";
import { Link, Redirect, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useAuth } from "../src/lib/auth-context";
import { getErrorMessage } from "../src/lib/errors";
import { Button } from "../src/components/ui/Button";
import { TextField } from "../src/components/ui/TextField";
import { ErrorBanner } from "../src/components/ui/ErrorBanner";
import { LoadingView } from "../src/components/ui/LoadingView";

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <LoadingView />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="flex-1 items-center justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-sm gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <View>
            <Text className="text-2xl font-bold text-slate-900">🍽️ DineFlow</Text>
            <Text className="mt-1 text-sm text-slate-500">Sign in to order from restaurants near you.</Text>
          </View>
          <ErrorBanner message={error} />
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          <Button loading={submitting} disabled={!email.trim() || !password} onPress={handleSubmit}>
            Sign in
          </Button>
          <View className="flex-row justify-center gap-1">
            <Text className="text-sm text-slate-500">New here?</Text>
            <Link href="/register" className="text-sm font-semibold text-slate-900">
              Create an account
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
