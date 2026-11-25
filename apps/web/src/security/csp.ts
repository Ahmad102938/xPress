/**
 * Content-Security-Policy builder (docs/specs/signed-in-home.md item 20; Step 0 result R2).
 *
 * - private (signed-in pages, rendered per request): a fresh nonce with 'strict-dynamic', no
 *   'unsafe-inline' for scripts. Next.js stamps the nonce on its own scripts; InlineScript takes it.
 * - public (prerendered, CDN-cacheable pages): `script-src 'self' 'unsafe-inline'`, because a
 *   static page has no per-request nonce and Next's page-data scripts are inline (author-approved).
 * Everything else is the same strict list on both levels. Cloudflare Turnstile is the one
 * third-party script, allowed only when its site key is configured.
 * Self-contained (process.env only), because next.config.ts may load it.
 */

export type CspLevel = "public" | "private";
type Env = Record<string, string | undefined>;

const TURNSTILE = "https://challenges.cloudflare.com";
export const CSP_REPORT_PATH = "/api/csp-report";

function supabaseOrigin(env: Env): string | null {
  try {
    return env.NEXT_PUBLIC_SUPABASE_URL ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
}

export function buildCsp({
  level,
  nonce,
  env = process.env,
}: {
  level: CspLevel;
  nonce?: string;
  env?: Env;
}): string {
  const dev = env.NODE_ENV === "development";
  const turnstile = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const supabase = supabaseOrigin(env);

  const script =
    level === "private" && nonce
      ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]
      : ["'self'", "'unsafe-inline'"];
  if (turnstile) script.push(TURNSTILE);
  if (dev) script.push("'unsafe-eval'");

  const connect = ["'self'", ...(supabase ? [supabase] : []), ...(turnstile ? [TURNSTILE] : [])];
  if (dev) connect.push("ws:");

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", script],
    // React style attributes and Radix positioning need inline styles; styles cannot run script.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["font-src", ["'self'"]],
    // Initials avatars only, so no remote image hosts.
    ["img-src", ["'self'", "data:", "blob:"]],
    ["connect-src", connect],
    ["frame-src", turnstile ? [TURNSTILE] : ["'none'"]],
    ["form-action", ["'self'", ...(supabase ? [supabase] : []), "https://accounts.google.com"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["report-uri", [CSP_REPORT_PATH]],
    ["report-to", ["csp"]],
  ];
  if (env.VERCEL === "1") directives.push(["upgrade-insecure-requests", []]);
  return directives.map(([name, values]) => [name, ...values].join(" ")).join("; ");
}

/** Pairs with `report-to csp`. */
export function reportingEndpointsHeader(): string {
  return `csp="${CSP_REPORT_PATH}"`;
}

/** A 128-bit random nonce, base64 encoded. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
