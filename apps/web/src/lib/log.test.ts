import { afterEach, describe, expect, it, vi } from "vitest";
import { logAuthEvent, sanitizeAuthLog } from "./log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sanitizeAuthLog", () => {
  it("keeps allowed fields with allowed values", () => {
    expect(
      sanitizeAuthLog("auth.otp_send", {
        method: "phone",
        outcome: "rate_limited",
        locale: "hi",
        requestId: "req-12345678",
      }),
    ).toEqual({
      event: "auth.otp_send",
      method: "phone",
      outcome: "rate_limited",
      locale: "hi",
      requestId: "req-12345678",
    });
  });

  it("drops values that could carry personal data or secrets", () => {
    const entry = sanitizeAuthLog("auth.otp_verify", {
      method: "+919000000001",
      outcome: "a.patient@example.test",
      locale: "/account?next=/x",
      requestId: "eyJhbGciOiJIUzI1NiJ9.payload.sig",
    });
    expect(entry).toEqual({ event: "auth.otp_verify" });
  });

  it("ignores fields that are not on the allow-list", () => {
    const fields = {
      method: "email",
      code: "123456",
      email: "x@example.test",
      token: "t",
      next: "/a",
      userId: "u",
    };
    expect(sanitizeAuthLog("auth.otp_send", fields)).toEqual({
      event: "auth.otp_send",
      method: "email",
    });
  });
});

describe("logAuthEvent", () => {
  it("writes one JSON line without any identifier", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logAuthEvent("auth.finish_signup", { method: "google", outcome: "ok", locale: "en" });
    const line = String(info.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      event: "auth.finish_signup",
      method: "google",
      outcome: "ok",
      locale: "en",
    });
  });
});
