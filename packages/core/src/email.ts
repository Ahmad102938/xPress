/** Trim and lower-case an email address before validation, rate-limit keys and display. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** `test@example.test` becomes `t•••@example.test`. Never shows more than the first character. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}
