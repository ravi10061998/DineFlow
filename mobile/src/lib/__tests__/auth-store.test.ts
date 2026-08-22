import { authStore } from "../auth-store";
import { secureStorage } from "../secure-storage";
import type { AuthUser } from "../types";

jest.mock("../secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const user: AuthUser = {
  id: "u1",
  email: "a@b.com",
  phone: null,
  fullName: "A B",
  status: "ACTIVE",
  role: "CUSTOMER",
  restaurantId: null,
  emailVerified: true,
};

describe("authStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(async () => {
    await authStore.clear();
  });

  it("init() reads the persisted refresh token but only actually fetches it once", async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue("persisted-refresh-token");
    // authStore.init() is called from auth-context.tsx's bootstrap effect, which itself can
    // run more than once (e.g. React StrictMode double-invoking effects) — it must be safe
    // to call repeatedly without re-reading storage every time.
    await authStore.init();
    await authStore.init();
    expect(secureStorage.getItem).toHaveBeenCalledTimes(1);
    expect(authStore.getRefreshToken()).toBe("persisted-refresh-token");
  });

  it("setSession stores tokens in memory and persists the refresh token", async () => {
    await authStore.setSession(user, { accessToken: "access-1", refreshToken: "refresh-1" });

    expect(authStore.getUser()).toEqual(user);
    expect(authStore.getAccessToken()).toBe("access-1");
    expect(authStore.getRefreshToken()).toBe("refresh-1");
    expect(secureStorage.setItem).toHaveBeenCalledWith("df_refresh_token", "refresh-1");
  });

  it("clear() wipes the session and removes the persisted refresh token", async () => {
    await authStore.setSession(user, { accessToken: "access-1", refreshToken: "refresh-1" });
    await authStore.clear();

    expect(authStore.getUser()).toBeNull();
    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBeNull();
    expect(secureStorage.removeItem).toHaveBeenCalledWith("df_refresh_token");
  });

  it("notifies subscribers on every session change", async () => {
    const listener = jest.fn();
    const unsubscribe = authStore.subscribe(listener);

    await authStore.setSession(user, { accessToken: "a", refreshToken: "r" });
    expect(listener).toHaveBeenCalledTimes(1);

    await authStore.clear();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await authStore.setSession(user, { accessToken: "a", refreshToken: "r" });
    expect(listener).toHaveBeenCalledTimes(2); // no further calls after unsubscribe
  });

  it("a persistence failure never blocks the in-memory session from updating", async () => {
    (secureStorage.setItem as jest.Mock).mockRejectedValue(new Error("disk full"));
    await authStore.setSession(user, { accessToken: "a", refreshToken: "r" });
    expect(authStore.getUser()).toEqual(user); // still succeeds despite the storage write failing
  });
});
