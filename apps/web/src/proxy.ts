import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@acurexpress/db/middleware";
import { routing } from "@/i18n/routing";

const intl = createMiddleware(routing);

/** `/auth/*` (OAuth callback, session state) is never locale-prefixed (docs/specs/auth.md R1-M2). */
function isAuthRoute(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

/**
 * 1. Locale negotiation and prefix handling (next-intl), skipped for /auth/*.
 * 2. Session refresh on that same response (getClaims, only when a session cookie exists;
 *    fail-safe without Supabase env).
 * Authorization is never decided here: protected pages and every server action check getUser().
 */
export default async function proxy(request: NextRequest) {
  const response = isAuthRoute(request.nextUrl.pathname) ? NextResponse.next() : intl(request);
  return updateSession(request, response);
}

export const config = {
  // Skip Next internals, API routes and files with an extension (images, icons, etc.).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
