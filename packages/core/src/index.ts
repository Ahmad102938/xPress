/** @acurexpress/core public API: pure, framework-free domain helpers shared by every app. */
export { flagDefinitions, getFlags, parseFlags, type FlagName, type Flags } from "./flags";
export { formatInr } from "./format";
export type { BadgeType } from "./doctor";
export { maskPhone, normalizeIndianPhone } from "./phone";
export { maskEmail, normalizeEmail } from "./email";
export { sanitizeNextPath } from "./next-path";
export {
  AUTH_METHOD_IDS,
  AUTH_METHOD_REGISTRY,
  parseAuthMethods,
  type AuthMethod,
  type AuthMethodId,
} from "./auth-methods";
export {
  AUTH_ERROR,
  PROFILE_ERRORS,
  SIGN_IN_ERRORS,
  isSilentSendSuccess,
  mapSupabaseAuthError,
  type AuthErrorContext,
  type AuthErrorKey,
  type ProfileErrorKey,
  type SignInErrorKey,
  type SupabaseAuthErrorLike,
} from "./auth-errors";
export {
  emailSchema,
  finishSignupInput,
  fullNameSchema,
  marketingSchema,
  otpCodeSchema,
  phoneSchema,
  sendEmailOtpInput,
  sendPhoneOtpInput,
  verifyOtpInput,
  type FinishSignupInput,
  type SendEmailOtpInput,
  type SendPhoneOtpInput,
  type VerifyOtpInput,
} from "./auth-schemas";
export {
  LEGAL_VERSIONS,
  hasPlaceholderLegalVersions,
  isPlaceholderLegalVersion,
  type LegalDocument,
} from "./legal";
