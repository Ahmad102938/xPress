"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * Browser Supabase client, kept for future public reads only.
 * Do NOT use it for auth: session cookies are httpOnly, so it cannot see the session
 * (docs/specs/auth.md G8). Sign-in, sign-out and user data go through server actions.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
