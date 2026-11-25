import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSessionWithClaims, type SessionHint } from "@acurexpress/db/middleware";
import { routing } from "@/i18n/routing";
import { buildCsp, createNonce } from "@/security/csp";
import {
  applyPrivateHeaders,
  applyPublicHeaders,
  buildRequestHeaders,
  finalizeResponse,
  isRedirect,
} from "@/security/rewrite";
import { routeClass, stripLocalePrefix } from "@/security/route-class";

const intl = createMiddleware(routing);

/**
 * The request pipeline (docs/specs/signed-in-home.md, Technical Plan "Request flow"):
 *   1. Locale negotiation (next-intl), skipped for /auth/*. Its redirects are returned as they are.
 *   2. Session refresh with getClaims() only when a session cookie exists. The result is a routing
 *      hint: none | valid | invalid (sb-* cookies deleted) | unknown (cookies kept).
 *   3. Route class: public | private | home | auth.
 *   4. "/" with a valid (or unknown) session is rewritten to /{locale}/home; the URL stays "/".
 *      A direct /home request goes back to "/".
 *   5. Headers: private pages and the rewritten home get the nonce CSP, no-store and noindex;
 *      everything else gets the public-level CSP.
 * Authorisation is never decided here: every private page, action and route calls getUser().
 */
export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cls = routeClass(pathname, routing.locales);
  const { locale: prefix, path } = stripLocalePrefix(pathname, routing.locales);

  // The internal signed-in home is only reachable through the "/" rewrite.
  if (path === "/home" || path === "/home/") {
    const target = new URL(prefix ? `/${prefix}` : "/", request.url);
    return applyPrivateHeaders(NextResponse.redirect(target, 307), {
      csp: buildCsp({ level: "public" }),
    });
  }

  const intlResponse = cls === "auth" ? NextResponse.next() : intl(request);
  const { session } = await updateSessionWithClaims(request, intlResponse);

  if (isRedirect(intlResponse)) {
    return cls === "private"
      ? applyPrivateHeaders(intlResponse, { csp: buildCsp({ level: "public" }) })
      : applyPublicHeaders(intlResponse, { csp: buildCsp({ level: "public" }) });
  }

  const signedInHome = cls === "home" && hasSessionHint(session);
  const isPrivate = cls === "private" || signedInHome;
  const nonce = isPrivate ? createNonce() : undefined;
  const requestHeaders = buildRequestHeaders(request, {
    requestId: crypto.randomUUID(),
    ...(nonce ? { nonce } : {}),
  });

  const locale = prefix ?? routing.defaultLocale;
  const response = finalizeResponse(
    request,
    intlResponse,
    requestHeaders,
    signedInHome ? `/${locale}/home` : undefined,
  );

  return isPrivate
    ? applyPrivateHeaders(response, {
        csp: buildCsp({ level: "private", ...(nonce ? { nonce } : {}) }),
      })
    : applyPublicHeaders(response, { csp: buildCsp({ level: "public" }) });
}

/** A cookie that verified, or one we could not check (outage): let the page decide with getUser(). */
function hasSessionHint(session: SessionHint): boolean {
  return session === "valid" || session === "unknown";
}

export const config = {
  // Skip Next internals, API routes and files with an extension (images, icons, etc.).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
