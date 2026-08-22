import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store has NO web implementation — its web platform file is a literal empty
 * stub (`export default {}`), so calling `getItemAsync`/`setItemAsync` on web throws
 * "is not a function". Found while verifying on this dev machine, whose only realistic
 * target is `expo start --web` (an Android/iOS emulator is too heavy alongside the backend
 * on 8GB RAM). Falls back to `localStorage` on web — the exact mechanism frontend's own
 * auth-store.ts already uses for the same refresh token — and keeps real Keychain/Keystore
 * storage via SecureStore on a genuine native build.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
