import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authCookieOptions, withSessionMaxAge } from "./cookies";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Server Supabase client bound to the signed-in user's cookies, so RLS applies.
 * - Session cookies: httpOnly, secure when deployed, sameSite lax, 30 days (docs/specs/auth.md G8).
 * - PKCE flow (forced by @supabase/ssr): used for verifyOtp, Google start/link, the callback,
 *   getUser() and the user's own database calls.
 * Never use the service role for a user's own request (docs/SUPABASE.md §8 rule 9).
 */
export async function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, withSessionMaxAge(options)),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes
          // the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Cookie-less client used ONLY to send one-time codes (sendPhoneOtp, sendEmailOtp,
 * sendStepUpEmailOtp). It never stores a session or a PKCE verifier, so a code send can never
 * overwrite the Google sign-in verifier cookie (R2-M1).
 */
export function createOtpSenderClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
