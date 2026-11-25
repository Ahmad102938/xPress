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
  return (await updateSessionWithClaims(request, response)).response;
}

/**
 * What the proxy learned about the session (docs/specs/signed-in-home.md item 15). A routing hint
 * only: pages still call getUser(), because getClaims() cannot see a global sign-out.
 * - none: no session cookie, or no Supabase env.
 * - valid: the token verified (and was refreshed if near expiry).
 * - invalid: Auth rejected the session (4xx, bad JWT, nothing usable in the cookie). The sb-*
 *   auth cookies are deleted on the response; the PKCE `-code-verifier` cookie is kept.
 * - unknown: network, 5xx or key-fetch failure. Cookies are kept, so an outage signs no one out.
 */
export type SessionHint = "none" | "valid" | "invalid" | "unknown";

interface ClaimsErrorLike {
  name?: string;
  status?: number;
}

export function classifyClaimsResult(result: {
  data: { claims?: unknown } | null;
  error: ClaimsErrorLike | null;
}): Exclude<SessionHint, "none"> {
  const { data, error } = result;
  if (!error) return data?.claims ? "valid" : "invalid";
  if (error.name === "AuthRetryableFetchError" || error.status === 0) return "unknown";
  if (typeof error.status === "number" && error.status >= 500) return "unknown";
  return "invalid";
}

function deleteAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (hasSupabaseAuthCookie([name])) {
      request.cookies.delete(name);
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }
}

export async function updateSessionWithClaims(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; session: SessionHint }> {
  if (!hasSupabaseAuthCookie(request.cookies.getAll().map((cookie) => cookie.name))) {
    return { response, session: "none" };
  }
  if (!hasSupabaseEnv()) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn("[auth] Supabase env missing; session refresh skipped.");
    }
    return { response, session: "none" };
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

  let session: Exclude<SessionHint, "none">;
  try {
    session = classifyClaimsResult(await supabase.auth.getClaims());
  } catch {
    // Fail safe: the page renders; protected pages and actions call getUser() themselves.
    session = "unknown";
  }
  if (session === "invalid") deleteAuthCookies(request, response);
  return { response, session };
}
