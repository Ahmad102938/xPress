import { describe, expect, it } from "vitest";
import {
  AUTH_ERROR,
  isSilentSendSuccess,
  mapSupabaseAuthError,
  SIGN_IN_ERRORS,
  type AuthErrorContext,
} from "./auth-errors";

const signInContexts: AuthErrorContext[] = ["send", "verify", "oauth"];

describe("mapSupabaseAuthError", () => {
  it.each([
    ["otp_expired", "invalid_or_expired"],
    ["over_request_rate_limit", "rate_limited"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["over_sms_send_rate_limit", "rate_limited"],
    ["captcha_failed", "captcha_failed"],
    ["signup_disabled", "method_disabled"],
    ["provider_disabled", "method_disabled"],
    ["email_provider_disabled", "method_disabled"],
    ["phone_provider_disabled", "method_disabled"],
    ["otp_disabled", "method_disabled"],
    ["bad_code_verifier", "unavailable"],
    ["flow_state_not_found", "unavailable"],
    ["flow_state_expired", "unavailable"],
    ["session_not_found", "unavailable"],
    ["sms_send_failed", "unavailable"],
    ["user_banned", "unavailable"],
    ["user_not_found", "unavailable"],
    ["validation_failed", "unavailable"],
    ["email_address_invalid", "unavailable"],
    ["manual_linking_disabled", "unavailable"],
    ["something_new", "unavailable"],
  ])("maps %s to %s", (code, key) => {
    expect(mapSupabaseAuthError({ code }, "verify")).toBe(key);
  });

  it("maps fetch failures to network_error", () => {
    expect(mapSupabaseAuthError({ name: "AuthRetryableFetchError" }, "send")).toBe("network_error");
    expect(mapSupabaseAuthError({ status: 0 }, "send")).toBe("network_error");
  });

  it("reveals 'in use' only on Profile", () => {
    expect(mapSupabaseAuthError({ code: "phone_exists" }, "profile")).toBe("in_use_phone");
    expect(mapSupabaseAuthError({ code: "email_exists" }, "profile")).toBe("in_use_email");
    expect(mapSupabaseAuthError({ code: "identity_already_exists" }, "profile")).toBe(
      "in_use_google",
    );
    expect(mapSupabaseAuthError({ code: "access_denied" }, "profile")).toBe("cancelled");
  });

  it.each(signInContexts)(
    "never returns an existence-revealing key on sign-in screens (%s)",
    (context) => {
      for (const code of [
        "phone_exists",
        "email_exists",
        "identity_already_exists",
        "user_already_exists",
        "user_not_found",
      ]) {
        const key = mapSupabaseAuthError({ code }, context);
        expect(SIGN_IN_ERRORS as readonly string[]).toContain(key);
        expect(key).toBe("unavailable");
      }
    },
  );

  it("only ever returns keys from the closed list", () => {
    expect(AUTH_ERROR as readonly string[]).toContain(mapSupabaseAuthError({}, "send"));
  });
});

describe("isSilentSendSuccess", () => {
  it("treats a disabled sign-up and an unknown user as a normal send", () => {
    expect(isSilentSendSuccess({ code: "signup_disabled" })).toBe(true);
    expect(isSilentSendSuccess({ code: "user_not_found" })).toBe(true);
  });

  it("does not hide real failures", () => {
    expect(isSilentSendSuccess({ code: "over_sms_send_rate_limit" })).toBe(false);
    expect(isSilentSendSuccess({})).toBe(false);
  });
});
