/**
 * Production build guard (docs/specs/auth.md R1-B1, R2-M5). Self-contained on purpose: plain
 * process.env and no workspace imports, because next.config.ts loads it.
 * - Runs only when VERCEL_ENV === "production". CI, local and preview builds are unaffected.
 * - Placeholder legal versions never fail the build; sign-in is hidden at runtime instead.
 * - Error messages name the variables, never their values.
 */
export const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RATE_LIMIT_HMAC_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export function missingProductionEnv(env: Record<string, string | undefined>): string[] {
  if (env.VERCEL_ENV !== "production") return [];
  return REQUIRED_PRODUCTION_ENV.filter((name) => !env[name]?.trim());
}

/** Env that must never be set on a Vercel production build (docs/specs/signed-in-home.md item 58). */
export const FORBIDDEN_PRODUCTION_ENV = ["PATIENT_HOME_FIXTURES"] as const;

export function forbiddenProductionEnv(env: Record<string, string | undefined>): string[] {
  if (env.VERCEL_ENV !== "production") return [];
  return FORBIDDEN_PRODUCTION_ENV.filter((name) => Boolean(env[name]?.trim()));
}

export function assertProductionEnv(env: Record<string, string | undefined> = process.env): void {
  const missing = missingProductionEnv(env);
  if (missing.length > 0) {
    throw new Error(`Production build is missing required env: ${missing.join(", ")}`);
  }
  const forbidden = forbiddenProductionEnv(env);
  if (forbidden.length > 0) {
    throw new Error(`Production build must not set: ${forbidden.join(", ")}`);
  }
}
