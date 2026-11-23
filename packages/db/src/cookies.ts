import type { CookieOptions, CookieOptionsWithName } from "@supabase/ssr";

/** 30 days, matched by the remote session settings (docs/specs/auth.md R1-N3). */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** True on Vercel deployments (R2-M4). Locally and in CI the site runs on plain http. */
export function isDeployed(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL === "1";
}

/**
 * Session cookie options for the server and proxy clients: httpOnly, secure when deployed,
 * sameSite lax (G8). The browser client is never used for auth, so httpOnly is safe.
 */
export function authCookieOptions(
  env: Record<string, string | undefined> = process.env,
): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: isDeployed(env),
  };
}

/**
 * @supabase/ssr replaces maxAge with its 400-day default after spreading cookieOptions (R2-M20),
 * so every setAll callback passes its options through here. Removals (maxAge 0) are left alone.
 */
export function withSessionMaxAge(options: CookieOptions): CookieOptions {
  if (typeof options.maxAge === "number" && options.maxAge > 0) {
    return { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
  }
  return options;
}

/** Supabase auth cookies are named sb-<project-ref>-auth-token (possibly chunked). */
export function hasSupabaseAuthCookie(names: readonly string[]): boolean {
  return names.some(
    (name) =>
      name.startsWith("sb-") && name.includes("-auth-token") && !name.endsWith("-code-verifier"),
  );
}
