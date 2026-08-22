import { assertProductionConfigIsSafe } from "./production-safety.util";

const REAL_SECRET = "a".repeat(64);

function makeEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    JWT_ACCESS_SECRET: REAL_SECRET,
    PAYMENT_GATEWAY_SECRET: REAL_SECRET,
    PAYMENT_WEBHOOK_SECRET: REAL_SECRET,
    CORS_ORIGIN: "https://app.example.com",
    ...overrides,
  };
}

describe("assertProductionConfigIsSafe", () => {
  it("does nothing outside production, no matter how bad the config is", () => {
    const env = makeEnv({ NODE_ENV: "development", JWT_ACCESS_SECRET: "dev-only-change-me-access", CORS_ORIGIN: undefined });
    expect(() => assertProductionConfigIsSafe(env)).not.toThrow();
  });

  it("passes in production with real, sufficiently long secrets and CORS_ORIGIN set", () => {
    expect(() => assertProductionConfigIsSafe(makeEnv({}))).not.toThrow();
  });

  it("throws when a required secret is missing entirely", () => {
    expect(() => assertProductionConfigIsSafe(makeEnv({ JWT_ACCESS_SECRET: undefined }))).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("throws when a secret is present but shorter than 32 characters", () => {
    expect(() => assertProductionConfigIsSafe(makeEnv({ PAYMENT_GATEWAY_SECRET: "short" }))).toThrow(/PAYMENT_GATEWAY_SECRET/);
  });

  it("throws when a secret still contains a dev-placeholder marker, even if it's long enough", () => {
    const placeholder = "dev-only-change-me-access-padded-to-be-over-32-characters-long";
    expect(() => assertProductionConfigIsSafe(makeEnv({ JWT_ACCESS_SECRET: placeholder }))).toThrow(/placeholder/);
  });

  it("throws when CORS_ORIGIN is not set", () => {
    expect(() => assertProductionConfigIsSafe(makeEnv({ CORS_ORIGIN: undefined }))).toThrow(/CORS_ORIGIN/);
  });

  it("reports every problem at once rather than stopping at the first", () => {
    expect(() =>
      assertProductionConfigIsSafe(makeEnv({ JWT_ACCESS_SECRET: undefined, PAYMENT_WEBHOOK_SECRET: undefined, CORS_ORIGIN: undefined })),
    ).toThrow(/JWT_ACCESS_SECRET[\s\S]*PAYMENT_WEBHOOK_SECRET[\s\S]*CORS_ORIGIN/);
  });
});
