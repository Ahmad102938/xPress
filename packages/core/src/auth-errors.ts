/**
 * One closed list of user-facing auth error keys and the Supabase error-code mapping
 * (docs/specs/auth.md R2-M15, R2-M18). On sign-in screens no key ever tells an existing account
 * from a new one.
 */

export const SIGN_IN_ERRORS = [
  "invalid_or_expired",
  "too_many_attempts",
  "rate_limited",
  "captcha_failed",
  "network_error",
  "method_disabled",
  "unavailable",
] as const;

export const PROFILE_ERRORS = [
  "in_use_phone",
  "in_use_email",
  "in_use_google",
  "cancelled",
] as const;

/** Recent sign-in and re-verify (docs/specs/signed-in-home.md item 81). */
export const ACCOUNT_SECURITY_ERRORS = ["reauth_required", "mismatch", "invalid_code"] as const;

export const AUTH_ERROR = [
  ...SIGN_IN_ERRORS,
  ...PROFILE_ERRORS,
  ...ACCOUNT_SECURITY_ERRORS,
] as const;

export type SignInErrorKey = (typeof SIGN_IN_ERRORS)[number];
export type ProfileErrorKey = (typeof PROFILE_ERRORS)[number];
export type AccountSecurityErrorKey = (typeof ACCOUNT_SECURITY_ERRORS)[number];
export type AuthErrorKey = (typeof AUTH_ERROR)[number];

/** Where the error happened. Only "profile" may reveal that a contact is in use (accepted v1). */
export type AuthErrorContext = "send" | "verify" | "oauth" | "profile";

/** The parts of a supabase-js AuthError we read. */
export interface SupabaseAuthErrorLike {
  code?: string | undefined;
  name?: string | undefined;
  status?: number | undefined;
}

const RATE_LIMITED = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

const METHOD_DISABLED = new Set([
  "signup_disabled",
  "provider_disabled",
  "email_provider_disabled",
  "phone_provider_disabled",
  "otp_disabled",
]);

const PROFILE_ONLY: Readonly<Record<string, ProfileErrorKey>> = {
  phone_exists: "in_use_phone",
  email_exists: "in_use_email",
  identity_already_exists: "in_use_google",
  access_denied: "cancelled",
};

/**
 * Send actions answer these exactly like success ("code sent", no code arrives), so a disabled
 * sign-up or an unknown account looks the same as a normal send (R2-M18).
 */
const SILENT_SEND_SUCCESS = new Set(["signup_disabled", "user_not_found"]);

export function isSilentSendSuccess(error: SupabaseAuthErrorLike): boolean {
  return error.code !== undefined && SILENT_SEND_SUCCESS.has(error.code);
}

function isNetworkError(error: SupabaseAuthErrorLike): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export function mapSupabaseAuthError(
  error: SupabaseAuthErrorLike,
  context: AuthErrorContext,
): AuthErrorKey {
  if (isNetworkError(error)) return "network_error";
  const code = error.code ?? "";

  if (context === "profile" && code in PROFILE_ONLY) {
    return PROFILE_ONLY[code] ?? "unavailable";
  }
  if (code === "otp_expired") return "invalid_or_expired";
  if (RATE_LIMITED.has(code)) return "rate_limited";
  if (code === "captcha_failed") return "captcha_failed";
  if (METHOD_DISABLED.has(code)) return "method_disabled";
  return "unavailable";
}
