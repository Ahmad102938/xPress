/**
 * Session settings the database never checks (docs/specs/signed-in-home.md item 11). The idle
 * timeout is client-side only; server session time-boxes are a Supabase Pro setting (docs/AUTH.md).
 */

/** Idle sign-out after this many minutes without activity (TODO_HCQ). */
export const SESSION_IDLE_DEFAULT_MINUTES = 30;

/** Whole minutes from 1 to 1440; anything else (missing, decimal, out of range) gives the fallback. */
export function parseMinutes(value: string | undefined, fallback: number): number {
  if (value === undefined || !/^\d{1,4}$/.test(value.trim())) return fallback;
  const minutes = Number(value.trim());
  return minutes >= 1 && minutes <= 1440 ? minutes : fallback;
}

/** The idle warning shows this long before sign-out: 2 minutes, or a quarter of short timeouts. */
export function idleWarningLeadMs(timeoutMs: number): number {
  return Math.min(120_000, Math.floor(timeoutMs / 4));
}
