"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { CustomerAddress } from "@/lib/address-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { AddressForm, type AddressFormValues } from "./address-form";

export function AddressList() {
  const { data: addresses, loading, error, reload } = useApiQuery(() => api.get<CustomerAddress[]>("/customer/me/addresses"));
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(values: AddressFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/customer/me/addresses", values);
      setAdding(false);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(id: string, values: AddressFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      await api.patch(`/customer/me/addresses/${id}`, values);
      setEditingId(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefault(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.patch(`/customer/me/addresses/${id}/default`, undefined);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(address: CustomerAddress) {
    if (!window.confirm(`Delete this ${address.label.toLowerCase()} address?`)) return;
    setActionError(null);
    setBusyId(address.id);
    try {
      await api.delete(`/customer/me/addresses/${address.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Saved addresses</h2>
        {!adding && (
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            + Add address
          </Button>
        )}
      </div>

      <ErrorBanner message={error ?? actionError} />

      {adding && (
        <div className="mb-4">
          <AddressForm onSubmit={handleCreate} onCancel={() => setAdding(false)} submitting={submitting} />
          <ErrorBanner message={formError} />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : addresses?.length === 0 && !adding ? (
        <p className="text-slate-400">No saved addresses yet — add one above.</p>
      ) : (
        <ul className="space-y-2">
          {addresses?.map((address) =>
            editingId === address.id ? (
              <li key={address.id}>
                <AddressForm address={address} onSubmit={(values) => handleEdit(address.id, values)} onCancel={() => setEditingId(null)} submitting={submitting} />
                <ErrorBanner message={formError} />
              </li>
            ) : (
              <li key={address.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{address.label}</span>
                      {address.isDefault && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Default</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{address.receiverName}</p>
                    <p className="text-sm text-slate-500">{address.receiverPhone}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {address.addressLine1}
                      {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                      {address.landmark ? ` (near ${address.landmark})` : ""}
                    </p>
                    <p className="text-sm text-slate-600">
                      {address.city}, {address.state} {address.postalCode}, {address.country}
                    </p>
                    {address.deliveryInstructions && <p className="mt-1 text-xs text-slate-400">{address.deliveryInstructions}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {!address.isDefault && (
                      <Button variant="secondary" loading={busyId === address.id} onClick={() => handleSetDefault(address.id)}>
                        Set default
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setEditingId(address.id)}>
                      Edit
                    </Button>
                    <Button variant="danger" loading={busyId === address.id} onClick={() => handleDelete(address)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
