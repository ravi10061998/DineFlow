"use client";

import { useState, type FormEvent } from "react";
import type { AddressLabel, CustomerAddress } from "@/lib/address-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextAreaField } from "@/components/ui/textarea-field";

const LABEL_OPTIONS: AddressLabel[] = ["HOME", "WORK", "OTHER"];

export interface AddressFormValues {
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryInstructions?: string;
}

function toFormValues(address?: CustomerAddress): AddressFormValues {
  return {
    label: address?.label ?? "HOME",
    receiverName: address?.receiverName ?? "",
    receiverPhone: address?.receiverPhone ?? "",
    addressLine1: address?.addressLine1 ?? "",
    addressLine2: address?.addressLine2 ?? "",
    landmark: address?.landmark ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postalCode: address?.postalCode ?? "",
    country: address?.country ?? "IN",
    deliveryInstructions: address?.deliveryInstructions ?? "",
  };
}

export function AddressForm({
  address,
  onSubmit,
  onCancel,
  submitting,
}: {
  address?: CustomerAddress;
  onSubmit: (values: AddressFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<AddressFormValues>(toFormValues(address));

  function set<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor="address-label" className="text-sm font-medium text-slate-700">
          Label
        </label>
        <select
          id="address-label"
          value={values.label}
          onChange={(e) => set("label", e.target.value as AddressLabel)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        >
          {LABEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0) + l.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <TextField label="Receiver name" required value={values.receiverName} onChange={(e) => set("receiverName", e.target.value)} />
      <TextField
        label="Receiver phone"
        type="tel"
        placeholder="+91XXXXXXXXXX"
        required
        value={values.receiverPhone}
        onChange={(e) => set("receiverPhone", e.target.value)}
      />

      <div className="col-span-2">
        <TextField label="Address line 1" required value={values.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
      </div>
      <div className="col-span-2">
        <TextField
          label="Address line 2 (optional)"
          value={values.addressLine2}
          onChange={(e) => set("addressLine2", e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <TextField label="Landmark (optional)" value={values.landmark} onChange={(e) => set("landmark", e.target.value)} />
      </div>

      <TextField label="City" required value={values.city} onChange={(e) => set("city", e.target.value)} />
      <TextField label="State" required value={values.state} onChange={(e) => set("state", e.target.value)} />
      <TextField label="Postal code" required value={values.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      <TextField
        label="Country (ISO code)"
        required
        maxLength={2}
        placeholder="IN"
        value={values.country}
        onChange={(e) => set("country", e.target.value.toUpperCase())}
      />

      <div className="col-span-2">
        <TextAreaField
          label="Delivery instructions (optional)"
          rows={2}
          value={values.deliveryInstructions}
          onChange={(e) => set("deliveryInstructions", e.target.value)}
        />
      </div>

      <div className="col-span-2 flex gap-2">
        <Button type="submit" loading={submitting}>
          {address ? "Save changes" : "Add address"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
