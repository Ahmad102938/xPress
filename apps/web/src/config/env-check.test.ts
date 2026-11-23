import { describe, expect, it } from "vitest";
import { assertProductionEnv, missingProductionEnv, REQUIRED_PRODUCTION_ENV } from "./env-check";

const complete = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((name) => [name, "set"]));

describe("assertProductionEnv", () => {
  it("does nothing outside Vercel production (CI, local, preview)", () => {
    expect(() => assertProductionEnv({})).not.toThrow();
    expect(() => assertProductionEnv({ VERCEL_ENV: "preview" })).not.toThrow();
    expect(() => assertProductionEnv({ NODE_ENV: "production" })).not.toThrow();
  });

  it("passes in production when everything is set", () => {
    expect(() => assertProductionEnv({ ...complete, VERCEL_ENV: "production" })).not.toThrow();
  });

  it("names missing variables without printing any values", () => {
    const env = {
      ...complete,
      VERCEL_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: " ",
      CRON_SECRET: undefined,
    };
    expect(missingProductionEnv(env)).toEqual(["SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"]);
    expect(() =>
      assertProductionEnv({ ...env, RATE_LIMIT_HMAC_SECRET: "super-secret-value" }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET/);
    try {
      assertProductionEnv({ ...env, RATE_LIMIT_HMAC_SECRET: "super-secret-value" });
    } catch (error) {
      expect(String(error)).not.toContain("super-secret-value");
    }
  });

  it("does not fail on placeholder legal versions (handled at runtime)", () => {
    expect(() =>
      assertProductionEnv({
        ...complete,
        VERCEL_ENV: "production",
        AUTH_METHODS: "phone,email,google",
      }),
    ).not.toThrow();
  });
});
