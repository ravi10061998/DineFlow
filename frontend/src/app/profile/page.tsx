"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { CustomerProfile, Gender } from "@/lib/customer-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ProfilePhoto } from "@/components/profile-photo";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

function ProfilePageContent() {
  const { logout } = useAuth();
  const { data: profile, loading, error, reload } = useApiQuery(() => api.get<CustomerProfile>("/customer/me/profile"));

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? "");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setGender(profile.gender ?? "");
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch("/customer/me/profile", {
        fullName,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPhoto(file: File) {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload("/customer/me/profile-photo", formData);
      reload();
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await api.delete("/customer/me/profile-photo");
      reload();
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-900">
            Back to home
          </Link>
          <button onClick={() => logout()} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account details and photo.</p>

        <ErrorBanner message={error} />

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Profile photo</h2>
              <ProfilePhoto
                hasPhoto={!!profile?.profilePhoto}
                onUpload={handleUploadPhoto}
                onRemove={handleRemovePhoto}
                busy={photoBusy}
              />
              <ErrorBanner message={photoError} />
            </div>

            <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-700">Account details</h2>
              <TextField label="Email" value={profile?.email ?? ""} disabled />
              <TextField label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <TextField label="Phone" type="tel" placeholder="+91XXXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <TextField label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender | "")}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Prefer not to say</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <ErrorBanner message={saveError} />
              {saved && !saveError && <p className="text-sm text-green-700">Saved.</p>}
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth roles={["CUSTOMER"]}>
      <ProfilePageContent />
    </RequireAuth>
  );
}
