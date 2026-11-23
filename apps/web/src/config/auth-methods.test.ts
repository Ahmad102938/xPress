import { describe, expect, it } from "vitest";
import { getAuthMethods, isMethodEnabled } from "./auth-methods";

describe("getAuthMethods", () => {
  it("uses AUTH_METHODS with phone first", () => {
    expect(getAuthMethods({ AUTH_METHODS: "google,email,phone" })).toEqual([
      "phone",
      "google",
      "email",
    ]);
  });

  it("defaults to Google when unset", () => {
    expect(getAuthMethods({})).toEqual(["google"]);
  });

  it("hides every method in production while legal versions are placeholders", () => {
    expect(
      getAuthMethods({ AUTH_METHODS: "phone,email,google", VERCEL_ENV: "production" }),
    ).toEqual([]);
    expect(isMethodEnabled("email", { AUTH_METHODS: "email", VERCEL_ENV: "production" })).toBe(
      false,
    );
  });

  it("keeps methods on preview deployments", () => {
    expect(getAuthMethods({ AUTH_METHODS: "email,google", VERCEL_ENV: "preview" })).toEqual([
      "email",
      "google",
    ]);
  });
});
