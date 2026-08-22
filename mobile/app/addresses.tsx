import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/lib/api-client";
import { useApiQuery } from "../src/lib/use-api-query";
import { getErrorMessage } from "../src/lib/errors";
import type { AddressLabel, CustomerAddress } from "../src/lib/types";
import { Button } from "../src/components/ui/Button";
import { ErrorBanner } from "../src/components/ui/ErrorBanner";
import { TextField } from "../src/components/ui/TextField";
import { LoadingView } from "../src/components/ui/LoadingView";

const LABEL_OPTIONS: AddressLabel[] = ["HOME", "WORK", "OTHER"];

interface AddressFormValues {
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryInstructions: string;
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

function AddressForm({
  address,
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  address?: CustomerAddress;
  onSubmit: (values: AddressFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<AddressFormValues>(toFormValues(address));
  const set = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canSubmit =
    values.receiverName.trim() &&
    values.receiverPhone.trim() &&
    values.addressLine1.trim() &&
    values.city.trim() &&
    values.state.trim() &&
    values.postalCode.trim() &&
    values.country.trim().length === 2;

  return (
    <View className="gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <View className="gap-1">
        <Text className="text-sm font-medium text-slate-700">Label</Text>
        <View className="flex-row gap-2">
          {LABEL_OPTIONS.map((l) => (
            <Pressable
              key={l}
              onPress={() => set("label", l)}
              className={`rounded-full border px-3 py-1.5 ${values.label === l ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}
            >
              <Text className={`text-xs ${values.label === l ? "text-white" : "text-slate-600"}`}>
                {l.charAt(0) + l.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextField label="Receiver name" value={values.receiverName} onChangeText={(v) => set("receiverName", v)} />
      <TextField
        label="Receiver phone"
        keyboardType="phone-pad"
        placeholder="+91XXXXXXXXXX"
        value={values.receiverPhone}
        onChangeText={(v) => set("receiverPhone", v)}
      />
      <TextField label="Address line 1" value={values.addressLine1} onChangeText={(v) => set("addressLine1", v)} />
      <TextField label="Address line 2 (optional)" value={values.addressLine2} onChangeText={(v) => set("addressLine2", v)} />
      <TextField label="Landmark (optional)" value={values.landmark} onChangeText={(v) => set("landmark", v)} />
      <TextField label="City" value={values.city} onChangeText={(v) => set("city", v)} />
      <TextField label="State" value={values.state} onChangeText={(v) => set("state", v)} />
      <TextField label="Postal code" keyboardType="number-pad" value={values.postalCode} onChangeText={(v) => set("postalCode", v)} />
      <TextField
        label="Country (ISO code)"
        maxLength={2}
        autoCapitalize="characters"
        placeholder="IN"
        value={values.country}
        onChangeText={(v) => set("country", v.toUpperCase())}
      />
      <TextField
        label="Delivery instructions (optional)"
        multiline
        value={values.deliveryInstructions}
        onChangeText={(v) => set("deliveryInstructions", v)}
      />

      <ErrorBanner message={error} />

      <View className="flex-row gap-2">
        <Button loading={submitting} disabled={!canSubmit} onPress={() => onSubmit(values)} className="flex-1">
          {address ? "Save changes" : "Add address"}
        </Button>
        <Button variant="secondary" onPress={onCancel} className="flex-1">
          Cancel
        </Button>
      </View>
    </View>
  );
}

export default function AddressesScreen() {
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

  function confirmDelete(address: CustomerAddress) {
    Alert.alert("Delete address", `Delete this ${address.label.toLowerCase()} address?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
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
        },
      },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-slate-900">Saved addresses</Text>
          {!adding && (
            <Button variant="secondary" onPress={() => setAdding(true)}>
              + Add address
            </Button>
          )}
        </View>

        <ErrorBanner message={error ?? actionError} />

        {adding && <AddressForm onSubmit={handleCreate} onCancel={() => setAdding(false)} submitting={submitting} error={formError} />}

        {addresses?.length === 0 && !adding && <Text className="text-slate-400">No saved addresses yet — add one above.</Text>}

        {addresses?.map((address) =>
          editingId === address.id ? (
            <AddressForm
              key={address.id}
              address={address}
              onSubmit={(values) => handleEdit(address.id, values)}
              onCancel={() => setEditingId(null)}
              submitting={submitting}
              error={formError}
            />
          ) : (
            <View key={address.id} className="gap-1 rounded-xl border border-slate-200 bg-white p-4">
              <View className="flex-row gap-2">
                <View className="self-start rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-xs font-medium text-slate-600">{address.label}</Text>
                </View>
                {address.isDefault && (
                  <View className="self-start rounded-full bg-green-100 px-2 py-0.5">
                    <Text className="text-xs font-medium text-green-700">Default</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-medium text-slate-900">{address.receiverName}</Text>
              <Text className="text-sm text-slate-500">{address.receiverPhone}</Text>
              <Text className="text-sm text-slate-600">
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                {address.landmark ? ` (near ${address.landmark})` : ""}
              </Text>
              <Text className="text-sm text-slate-600">
                {address.city}, {address.state} {address.postalCode}, {address.country}
              </Text>
              {address.deliveryInstructions && <Text className="text-xs text-slate-400">{address.deliveryInstructions}</Text>}

              <View className="mt-2 flex-row gap-2">
                {!address.isDefault && (
                  <Button variant="secondary" loading={busyId === address.id} onPress={() => handleSetDefault(address.id)} className="flex-1">
                    Set default
                  </Button>
                )}
                <Button variant="secondary" onPress={() => setEditingId(address.id)} className="flex-1">
                  Edit
                </Button>
                <Button variant="danger" loading={busyId === address.id} onPress={() => confirmDelete(address)} className="flex-1">
                  Delete
                </Button>
              </View>
            </View>
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
