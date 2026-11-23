/**
 * Indian mobile numbers only (+91). The phone method is the strongest SMS-pumping defence when it
 * refuses every other country (docs/specs/auth.md G7).
 */

const INDIAN_MOBILE = /^(?:\+91|91|0)?([6-9]\d{9})$/;

/**
 * Returns `+91XXXXXXXXXX` for a 10-digit Indian mobile number starting 6 to 9, written with an
 * optional `+91`, `91` or `0` prefix and spaces or dashes. Anything else returns null.
 */
export function normalizeIndianPhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s-]/g, "");
  const match = INDIAN_MOBILE.exec(cleaned);
  return match ? `+91${match[1]}` : null;
}

/** `+919876543210` becomes `+91 98XXXXXX10`. Input that is not a normalised number is fully masked. */
export function maskPhone(normalized: string): string {
  const match = /^\+91(\d{2})\d{6}(\d{2})$/.exec(normalized);
  if (!match) return "+91 XXXXXXXXXX";
  return `+91 ${match[1]}XXXXXX${match[2]}`;
}
