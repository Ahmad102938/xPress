import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "./env";

/**
 * Server Supabase client bound to the signed-in user's cookies, so RLS applies.
 * Never use the service role for a user's own request (docs/SUPABASE.md §8 rule 9).
 * TODO(db): add the generated `Database` type once migrations exist.
 */
export async function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes
          // the session instead, so this is safe to ignore.
        }
      },
    },
  });
}
