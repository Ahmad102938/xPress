/**
 * The site's own origin, from NEXT_PUBLIC_SITE_URL, never from the Host header (open-redirect and
 * host-header defence; docs/specs/auth.md threat model). OAuth redirectTo URLs are built from it.
 * Locally it falls back to http://localhost:3000; deployed it is required (env-check.ts).
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    if (env.VERCEL === "1") throw new Error("NEXT_PUBLIC_SITE_URL is missing.");
    return "http://localhost:3000";
  }
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be http(s).");
  }
  return url.origin;
}

/** Absolute URL on this site for a path that has already been sanitised. */
export function absoluteUrl(path: string, env?: Record<string, string | undefined>): string {
  return new URL(path, siteUrl(env)).toString();
}
