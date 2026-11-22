"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

/**
 * Browser Supabase client. Uses the anon key and the user's session, so RLS always applies.
 * TODO(db): add the generated `Database` type once `pnpm db:types` has a schema to read.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
