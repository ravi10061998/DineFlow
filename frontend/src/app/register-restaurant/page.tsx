"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { AuthUser, Restaurant, TokenPair } from "@/lib/types";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Logo } from "@/components/logo";

const initialForm = {
  restaurantName: "",
  ownerFullName: "",
  email: "",
  password: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
};

export default function RegisterRestaurantPage() {
  const { applySession } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ restaurant: Restaurant; user: AuthUser } & TokenPair>(
        "/restaurants/register",
        form,
        { skipAuth: true },
      );
      applySession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.push("/restaurant");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-10">
      <Link href="/">
        <Logo />
      </Link>
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Register your restaurant</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your restaurant starts in <span className="font-medium">PENDING</span> status until an admin approves it.
          </p>
        </div>
        <ErrorBanner message={error} />

        <TextField label="Restaurant name" required value={form.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} />
        <TextField label="Owner full name" required value={form.ownerFullName} onChange={(e) => update("ownerFullName", e.target.value)} />

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
          <TextField label="Phone" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        <TextField
          label="Password"
          type="password"
          minLength={8}
          required
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />

        <TextField label="Address line 1" required value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} />

        <div className="grid grid-cols-2 gap-4">
          <TextField label="City" required value={form.city} onChange={(e) => update("city", e.target.value)} />
          <TextField label="State" required value={form.state} onChange={(e) => update("state", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Postal code" required value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
          <TextField label="Country (2-letter)" required maxLength={2} value={form.country} onChange={(e) => update("country", e.target.value.toUpperCase())} />
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Register restaurant
        </Button>
        <p className="text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
