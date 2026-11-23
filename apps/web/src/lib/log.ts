import { AUTH_ERROR, AUTH_METHOD_IDS } from "@acurexpress/core";

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
] as const;
export type AuthEvent = (typeof AUTH_EVENTS)[number];

const OUTCOMES = new Set<string>(["ok", "invalid_input", ...AUTH_ERROR]);
const METHODS = new Set<string>([...AUTH_METHOD_IDS, "none"]);
const LOCALES = new Set(["en", "hi"]);
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export interface AuthLogFields {
  method?: string;
  outcome?: string;
  locale?: string;
  requestId?: string;
  count?: number;
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
  return entry;
}

export function logAuthEvent(event: AuthEvent, fields: AuthLogFields = {}): void {
  // Structured outcome line; every field passed the allow-list above.
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(sanitizeAuthLog(event, fields)));
}
