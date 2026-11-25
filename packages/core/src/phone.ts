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

/**
 * `+919876544321` becomes `+91 •••••• 4321` (docs/specs/signed-in-home.md item 9): the country code
 * and the last four digits only. Other E.164 numbers show only their last four digits, because a
 * country code's length cannot be told without a table. Anything else is fully masked.
 */
export function maskPhone(normalized: string): string {
  const indian = /^\+91\d{6}(\d{4})$/.exec(normalized);
  if (indian) return `+91 •••••• ${indian[1]}`;
  const other = /^\+\d{4,11}(\d{4})$/.exec(normalized);
  if (other) return `•••••• ${other[1]}`;
  return "••••••••••";
}
