"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import type { AuthUser, TokenPair } from "@/lib/types";
import type { VehicleType } from "@/lib/delivery-partner-types";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Logo } from "@/components/logo";

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "BICYCLE", label: "Bicycle" },
  { value: "BIKE", label: "Bike" },
  { value: "SCOOTER", label: "Scooter" },
  { value: "CAR", label: "Car" },
];

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  vehicleType: "BIKE" as VehicleType,
  vehicleNumber: "",
  licenseNumber: "",
};

export default function RegisterDeliveryPartnerPage() {
  const { applySession } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ user: AuthUser } & TokenPair>("/delivery-partners/register", form, { skipAuth: true });
      applySession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.push("/delivery");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 py-10">
      <Logo />
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Become a delivery partner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your account starts in <span className="font-medium">PENDING</span> status until an admin approves it.
          </p>
        </div>
        <ErrorBanner message={error} />

        <TextField label="Full name" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />

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

        <div className="flex flex-col gap-1">
          <label htmlFor="vehicleType" className="text-sm font-medium text-slate-700">
            Vehicle type
          </label>
          <select
            id="vehicleType"
            value={form.vehicleType}
            onChange={(e) => update("vehicleType", e.target.value as VehicleType)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            {VEHICLE_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Vehicle number" required value={form.vehicleNumber} onChange={(e) => update("vehicleNumber", e.target.value)} />
          <TextField label="License number" required value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Register as a delivery partner
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
