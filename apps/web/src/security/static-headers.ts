import { reportingEndpointsHeader } from "./csp";

/**
 * Headers for every response (docs/specs/signed-in-home.md item 21), from next.config.ts
 * `headers()`. No CSP here: the proxy sets exactly one CSP per page (public or private level).
 * HSTS only when deployed (VERCEL=1); locally the site is plain http.
 * Self-contained (relative imports, process.env only) because next.config.ts loads it.
 */
export function staticHeaders(
  env: Record<string, string | undefined> = process.env,
): Array<{ key: string; value: string }> {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // geolocation=(self): the "Deliver to" sheet may ask for the device location.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
    },
    // Old browsers that ignore CSP frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Reporting-Endpoints", value: reportingEndpointsHeader() },
  ];
  if (env.VERCEL === "1") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
