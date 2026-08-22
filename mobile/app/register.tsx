import { useState } from "react";
import { Link, Redirect, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useAuth } from "../src/lib/auth-context";
import { api } from "../src/lib/api-client";
import { getErrorMessage } from "../src/lib/errors";
import type { AuthUser, TokenPair } from "../src/lib/types";
import { Button } from "../src/components/ui/Button";
import { TextField } from "../src/components/ui/TextField";
import { ErrorBanner } from "../src/components/ui/ErrorBanner";
import { LoadingView } from "../src/components/ui/LoadingView";

export default function RegisterScreen() {
  const { applySession, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
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
      const data = await api.post<{ user: AuthUser } & TokenPair>(
        "/auth/register",
        { fullName: fullName.trim(), email: email.trim(), password },
        { skipAuth: true },
      );
      await applySession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
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
            <Text className="text-xl font-semibold text-slate-900">Create your account</Text>
            <Text className="mt-1 text-sm text-slate-500">Order from restaurants near you.</Text>
          </View>
          <ErrorBanner message={error} />
          <TextField label="Full name" autoComplete="name" value={fullName} onChangeText={setFullName} />
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
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
          />
          <Button
            loading={submitting}
            disabled={!fullName.trim() || !email.trim() || password.length < 8}
            onPress={handleSubmit}
          >
            Create account
          </Button>
          <View className="flex-row justify-center gap-1">
            <Text className="text-sm text-slate-500">Already have an account?</Text>
            <Link href="/login" className="text-sm font-semibold text-slate-900">
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
