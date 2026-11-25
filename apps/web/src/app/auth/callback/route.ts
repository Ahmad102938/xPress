import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { mapSupabaseAuthError, safeReturnPath, type AuthErrorKey } from "@acurexpress/core";
import { hasSupabaseEnv } from "@acurexpress/db";
import { createClient } from "@acurexpress/db/server";
import { authState } from "@/features/auth/server/auth-state";
import { methodCookie } from "@/features/auth/server/method-cookie";
import { markRecentAuth, sessionIdFromToken } from "@/features/auth/server/recent-auth";
import { routing } from "@/i18n/routing";
import { logAuthEvent } from "@/lib/log";
import { siteUrl } from "@/lib/site-url";

/**
 * Google sign-in and connect-Google callback (docs/specs/auth.md items 25, 56; R1-M10, R2-M1).
 * - Exchanges the PKCE code on the cookie client, then runs the gate.
 * - Sign-in: back to the sanitised `next`, opening the panel at Finish sign-up or step-up when
 *   needed (a Google session clears its own step-up first), or with `?login=1&error=` on failure.
 * - Link (`flow=link`): back to Profile with `?link=google | in_use_google | cancelled | unavailable`.
 * Every redirect is built from NEXT_PUBLIC_SITE_URL, never the Host header. `next` goes through
 * safeReturnPath, so a record id never comes back in it (docs/specs/signed-in-home.md item 46).
 */

function to(path: string, params: Record<string, string> = {}): NextResponse {
  const url = new URL(path, siteUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const isLink = params.get("flow") === "link";
  const next = safeReturnPath(params.get("next"), routing.locales);
  const profile = next === "/" ? "/account" : next;

  function failed(error: AuthErrorKey | null) {
    logAuthEvent(isLink ? "auth.link_identity" : "auth.oauth_callback", {
      method: "google",
      outcome: error ?? "cancelled",
    });
    if (isLink) return to(profile, { link: error ?? "cancelled" });
    return to(next, error ? { login: "1", error } : { login: "1" });
  }

  const providerError = params.get("error_code") ?? params.get("error");
  if (providerError) {
    if (providerError === "access_denied") return failed(isLink ? "cancelled" : null);
    return failed(mapSupabaseAuthError({ code: providerError }, isLink ? "profile" : "oauth"));
  }

  const code = params.get("code");
  if (!code || !hasSupabaseEnv()) return failed("unavailable");

  const supabase = await createClient();
  const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed(mapSupabaseAuthError(error, isLink ? "profile" : "oauth"));

  if (isLink) {
    logAuthEvent("auth.link_identity", { method: "google", outcome: "ok" });
    return to(profile, { link: "google" });
  }

  const cookie = methodCookie("google");
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
  // A real Google sign-in (not link mode): issue the recent sign-in proof for this new session.
  await markRecentAuth(supabase, sessionIdFromToken(exchanged.session?.access_token));

  let auth = await authState(supabase);
  if (auth.state === "step_up") {
    // A Google session clears its own step-up (checked in the database, amr "oauth").
    await supabase.rpc("complete_step_up");
    auth = await authState(supabase);
  }

  logAuthEvent("auth.oauth_callback", { method: "google", outcome: "ok" });
  if (auth.state === "needs_finish") return to(next, { login: "1", step: "finish" });
  if (auth.state === "step_up") return to(next, { login: "1", step: "step_up" });
  return to(next);
}
