import { AUTH_ERROR, AUTH_METHOD_IDS, PATIENT_PROFILE_ERROR } from "@acurexpress/core";

/**
 * Allow-list logger for auth outcomes (docs/specs/auth.md G11, "Observability").
 * Only these fields are ever written, and each value must match its allow-list, so a code, phone,
 * email, token, return path or user id can never reach the logs. Anything else is dropped.
 */

export const AUTH_EVENTS = [
  "auth.otp_send",
  "auth.otp_verify",
  "auth.oauth_callback",
  "auth.finish_signup",
  "auth.link_identity",
  "auth.contact_change",
  "auth.step_up",
  "auth.sign_out",
  "auth.cleanup",
  // docs/specs/signed-in-home.md item 36
  "auth.reverify",
  "auth.sign_out_all",
  "account.deletion_request",
  "profile.switch",
  "profile.change",
  "session.idle_sign_out",
  "home.rewrite",
  "csp.report",
] as const;
export type AuthEvent = (typeof AUTH_EVENTS)[number];

const OUTCOMES = new Set<string>([
  "ok",
  "invalid_input",
  "failed",
  "cancelled",
  ...AUTH_ERROR,
  ...PATIENT_PROFILE_ERROR,
  // home.rewrite outcomes (the proxy's session hint)
  "valid",
  "invalid",
  "unknown",
]);
/** CSP directives a violation report may name. Anything else is dropped. */
const CSP_DIRECTIVES = new Set([
  "default-src",
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "style-src",
  "style-src-elem",
  "style-src-attr",
  "img-src",
  "font-src",
  "connect-src",
  "frame-src",
  "form-action",
  "object-src",
  "base-uri",
  "frame-ancestors",
]);
const BLOCKED_KEYWORDS = new Set(["inline", "eval", "data", "blob", "self"]);

/** Scheme and host only (lower case), or a CSP keyword. Paths, queries and ports are dropped. */
export function normaliseBlockedOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (BLOCKED_KEYWORDS.has(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return `${url.protocol}//${url.hostname.toLowerCase()}`;
  } catch {
    return undefined;
  }
}
const METHODS = new Set<string>([...AUTH_METHOD_IDS, "none"]);
const LOCALES = new Set(["en", "hi"]);
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export interface AuthLogFields {
  method?: string;
  outcome?: string;
  locale?: string;
  requestId?: string;
  count?: number;
  /** csp.report only. */
  directive?: string;
  /** csp.report only: scheme + host, or a CSP keyword. */
  blockedOrigin?: string;
}

export function sanitizeAuthLog(
  event: AuthEvent,
  fields: AuthLogFields,
): Record<string, string | number> {
  const entry: Record<string, string | number> = { event };
  if (fields.method && METHODS.has(fields.method)) entry.method = fields.method;
  if (fields.outcome && OUTCOMES.has(fields.outcome)) entry.outcome = fields.outcome;
  if (fields.locale && LOCALES.has(fields.locale)) entry.locale = fields.locale;
  if (fields.requestId && REQUEST_ID.test(fields.requestId)) entry.requestId = fields.requestId;
  if (typeof fields.count === "number" && Number.isInteger(fields.count) && fields.count >= 0)
    entry.count = fields.count;
  if (fields.directive && CSP_DIRECTIVES.has(fields.directive)) entry.directive = fields.directive;
  const origin = normaliseBlockedOrigin(fields.blockedOrigin);
  if (origin) entry.blockedOrigin = origin;
  return entry;
}

export function logAuthEvent(event: AuthEvent, fields: AuthLogFields = {}): void {
  // Structured outcome line; every field passed the allow-list above.
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(sanitizeAuthLog(event, fields)));
}
