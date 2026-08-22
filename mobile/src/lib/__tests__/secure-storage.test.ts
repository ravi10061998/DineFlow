import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { secureStorage } from "../secure-storage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secureStorage", () => {
  afterEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
    (globalThis as any).localStorage = undefined;
  });

  describe("on native (iOS/Android)", () => {
    it("delegates get/set/remove to expo-secure-store", async () => {
      Platform.OS = "ios";
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-value");

      await expect(secureStorage.getItem("k")).resolves.toBe("stored-value");
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("k");

      await secureStorage.setItem("k", "v");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith("k", "v");

      await secureStorage.removeItem("k");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("k");
    });
  });

  describe("on web", () => {
    // expo-secure-store has NO web implementation at all (its .web.ts platform file is a
    // literal empty stub) — calling it under `expo start --web` throws. This is the exact
    // real bug found via Playwright verification; these tests lock in the fix so it can't
    // silently regress if secure-storage.ts is ever "simplified" back to calling SecureStore
    // directly.
    beforeEach(() => {
      Platform.OS = "web";
      (globalThis as any).localStorage = {
        store: new Map<string, string>(),
        getItem(k: string) {
          return this.store.has(k) ? this.store.get(k) : null;
        },
        setItem(k: string, v: string) {
          this.store.set(k, v);
        },
        removeItem(k: string) {
          this.store.delete(k);
        },
      };
    });

    it("never calls expo-secure-store", async () => {
      await secureStorage.setItem("k", "v");
      await secureStorage.getItem("k");
      await secureStorage.removeItem("k");
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it("round-trips values through localStorage", async () => {
      await secureStorage.setItem("df_refresh_token", "abc123");
      await expect(secureStorage.getItem("df_refresh_token")).resolves.toBe("abc123");
      await secureStorage.removeItem("df_refresh_token");
      await expect(secureStorage.getItem("df_refresh_token")).resolves.toBeNull();
    });

    it("returns null instead of throwing when localStorage is unavailable", async () => {
      (globalThis as any).localStorage = undefined;
      await expect(secureStorage.getItem("k")).resolves.toBeNull();
      await expect(secureStorage.setItem("k", "v")).resolves.toBeUndefined();
    });
  });
});
