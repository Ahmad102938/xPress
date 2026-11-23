import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { authCookieOptions, hasSupabaseAuthCookie, withSessionMaxAge } from "./cookies";
import type { Database } from "./database.types";
import { getSupabasePublicEnv, hasSupabaseEnv } from "./env";

let warnedMissingEnv = false;

/**
 * Refreshes the Supabase session on a response produced by an app's proxy.ts (docs/specs/auth.md Q5).
 * - Visitors without a session cookie: returns at once, no Supabase call.
 * - getClaims() verifies the JWT (locally with asymmetric signing keys) and refreshes it near
 *   expiry; refreshed cookies are written to both the request and the given response.
 * - Missing Supabase env: logs one warning without identifiers and returns the response unchanged.
 * - Any Supabase failure: returns the response unchanged (pages still render; actions re-check).
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!hasSupabaseAuthCookie(request.cookies.getAll().map((cookie) => cookie.name))) {
    return response;
  }
  if (!hasSupabaseEnv()) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn("[auth] Supabase env missing; session refresh skipped.");
    }
    return response;
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, withSessionMaxAge(options)),
        );
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Fail safe: the page renders; protected pages and actions call getUser() themselves.
  }
  return response;
}
