import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "./csp";

/**
 * Proxy response helpers (docs/specs/signed-in-home.md item 22).
 *
 * Next reads request-header overrides (the nonce in a request CSP header, x-request-id, refreshed
 * session cookies) only from `NextResponse.next/rewrite({ request: { headers } })`. next-intl builds
 * its own response first, so we build the final one ourselves and copy intl's headers and cookies.
 */

export interface RequestHeaderOptions {
  requestId: string;
  /** Private pages under CSP level R2 only. */
  nonce?: string;
}

/** Built from the request AFTER the session refresh, so refreshed cookies reach server code. */
export function buildRequestHeaders(
  request: NextRequest,
  { requestId, nonce }: RequestHeaderOptions,
): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  headers.delete("x-nonce");
  headers.delete("content-security-policy");
  if (nonce) {
    headers.set("x-nonce", nonce);
    // Next extracts the nonce from this request header and stamps it on its scripts.
    headers.set("content-security-policy", buildCsp({ level: "private", nonce }));
  }
  return headers;
}

export function isRedirect(response: Response): boolean {
  return response.status >= 300 && response.status < 400 && response.headers.has("location");
}

/**
 * The final response: intl's redirect untouched, otherwise a next/rewrite carrying the request
 * headers, with intl's response headers (except Next internals) and cookies copied over.
 */
export function finalizeResponse(
  request: NextRequest,
  intlResponse: NextResponse,
  requestHeaders: Headers,
  rewriteTo?: string,
): NextResponse {
  if (isRedirect(intlResponse)) return intlResponse;
  const intlRewrite = intlResponse.headers.get("x-middleware-rewrite");
  let target: URL | null = null;
  if (rewriteTo) {
    // Keep the query string: `new URL(path, base)` alone would drop it.
    target = new URL(rewriteTo, request.url);
    target.search = request.nextUrl.search;
  } else if (intlRewrite) {
    target = new URL(intlRewrite);
  }
  const response = target
    ? NextResponse.rewrite(target, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  intlResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith("x-middleware-") || lower === "set-cookie") return;
    response.headers.set(key, value);
  });
  for (const cookie of intlResponse.cookies.getAll()) response.cookies.set(cookie);
  return response;
}

export function applyPrivateHeaders(
  response: NextResponse,
  { csp, reportOnly = false }: { csp: string; reportOnly?: boolean },
) {
  response.headers.set(
    reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    csp,
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function applyPublicHeaders(response: NextResponse, { csp }: { csp: string }) {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
