import { describe, expect, it } from "vitest";
import { AUTH_METHOD_REGISTRY, parseAuthMethods } from "./auth-methods";

const open = { blockAll: false };

describe("parseAuthMethods", () => {
  it("defaults to Google when unset or blank", () => {
    expect(parseAuthMethods(undefined, open)).toEqual(["google"]);
    expect(parseAuthMethods("  ", open)).toEqual(["google"]);
    expect(parseAuthMethods(" , ", open)).toEqual(["google"]);
  });

  it("parses the local list with phone first", () => {
    expect(parseAuthMethods("phone,email,google", open)).toEqual(["phone", "email", "google"]);
  });

  it("moves phone to the front and keeps the rest in order", () => {
    expect(parseAuthMethods("google, email ,PHONE", open)).toEqual(["phone", "google", "email"]);
  });

  it("parses the deployed list without phone", () => {
    expect(parseAuthMethods("email,google", open)).toEqual(["email", "google"]);
  });

  it("drops duplicates", () => {
    expect(parseAuthMethods("email,email,google", open)).toEqual(["email", "google"]);
  });

  it("throws on unknown values", () => {
    expect(() => parseAuthMethods("phone,whatsapp", open)).toThrow(/whatsapp/);
  });

  it("returns no methods when blocked (production with placeholder legal versions)", () => {
    expect(parseAuthMethods("phone,email,google", { blockAll: true })).toEqual([]);
    expect(parseAuthMethods(undefined, { blockAll: true })).toEqual([]);
  });
});

describe("AUTH_METHOD_REGISTRY", () => {
  it("marks codes and redirects", () => {
    expect(AUTH_METHOD_REGISTRY.phone.kind).toBe("otp");
    expect(AUTH_METHOD_REGISTRY.email.kind).toBe("otp");
    expect(AUTH_METHOD_REGISTRY.google.kind).toBe("oauth");
  });
});
