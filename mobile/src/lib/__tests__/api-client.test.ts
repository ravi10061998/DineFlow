import { api, apiFetch, ApiError } from "../api-client";
import { authStore } from "../auth-store";

jest.mock("../auth-store", () => ({
  authStore: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    getUser: jest.fn(),
    setSession: jest.fn(),
    clear: jest.fn(),
  },
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

const envelope = (data: unknown) => ({ success: true, data, message: "OK", error: null });
const errorEnvelope = (code: string, message: string) => ({ success: false, data: null, message, error: { code } });

describe("api-client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authStore.getAccessToken as jest.Mock).mockReturnValue("access-token");
    (authStore.getRefreshToken as jest.Mock).mockReturnValue("refresh-token");
    (authStore.getUser as jest.Mock).mockReturnValue({ id: "u1" });
    global.fetch = jest.fn();
  });

  it("attaches the Authorization header from authStore on every request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, envelope({ ok: true })));
    await apiFetch("/some/path");

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("skips the Authorization header when skipAuth is set (login/register/refresh)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, envelope({ ok: true })));
    await apiFetch("/auth/login", { method: "POST", skipAuth: true });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.has("Authorization")).toBe(false);
  });

  it("unwraps the envelope's data field on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, envelope({ id: "abc" })));
    await expect(apiFetch("/x")).resolves.toEqual({ id: "abc" });
  });

  it("throws ApiError with the envelope's code/message/details on a business error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(409, errorEnvelope("CART_EMPTY", "Your cart is empty")));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      name: "ApiError",
      code: "CART_EMPTY",
      message: "Your cart is empty",
      status: 409,
    });
  });

  it("on a 401, refreshes the session once and retries the original request", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401, errorEnvelope("UNAUTHORIZED", "expired")))
      .mockResolvedValueOnce(jsonResponse(200, envelope({ accessToken: "new-access", refreshToken: "new-refresh" })))
      .mockResolvedValueOnce(jsonResponse(200, envelope({ ok: true })));

    const result = await apiFetch("/customer/me/cart");

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(3); // original (401) -> refresh -> retried original
    expect(authStore.setSession).toHaveBeenCalledWith({ id: "u1" }, { accessToken: "new-access", refreshToken: "new-refresh" });
  });

  it("clears the session when the refresh attempt itself fails, surfacing the original request's error", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(401, errorEnvelope("UNAUTHORIZED", "expired")))
      .mockResolvedValueOnce(jsonResponse(401, errorEnvelope("INVALID_REFRESH_TOKEN", "invalid")));

    // A failed refresh never retries the original request — the original 401's own error is
    // what the caller sees, not the refresh call's error (same as web's api-client.ts).
    await expect(apiFetch("/customer/me/cart")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(authStore.clear).toHaveBeenCalled();
  });

  it("never attempts a refresh for a request that already has skipAuth (avoids infinite loop on /auth/refresh itself)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, errorEnvelope("UNAUTHORIZED", "bad creds")));
    await expect(apiFetch("/auth/login", { skipAuth: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(authStore.clear).not.toHaveBeenCalled();
  });

  it("shares one in-flight refresh across concurrent 401s instead of refreshing twice", async () => {
    let refreshCalls = 0;
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        return Promise.resolve(jsonResponse(200, envelope({ accessToken: "new", refreshToken: "new-r" })));
      }
      // Each of /a and /b 401s on its first call, then succeeds once retried post-refresh.
      const callsSoFar = (global.fetch as jest.Mock).mock.calls.filter((c: unknown[]) => c[0] === url).length;
      return Promise.resolve(
        callsSoFar < 2 ? jsonResponse(401, errorEnvelope("UNAUTHORIZED", "expired")) : jsonResponse(200, envelope({ ok: true })),
      );
    });

    await Promise.all([apiFetch("/a"), apiFetch("/b")]);
    expect(refreshCalls).toBe(1);
  });

  it("the api.* helpers serialize JSON bodies and set the right HTTP method", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, envelope({ ok: true })));
    await api.post("/customer/me/cart", { productId: "p1", quantity: 2 });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ productId: "p1", quantity: 2 });
  });

  it("ApiError instances are recognizable via instanceof", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(404, errorEnvelope("NOT_FOUND", "missing")));
    try {
      await apiFetch("/x");
      throw new Error("expected apiFetch to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
