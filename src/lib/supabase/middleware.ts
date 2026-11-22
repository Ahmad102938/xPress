import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv } from "./env";

/**
 * Refreshes the Supabase auth session on a response produced by the proxy (src/proxy.ts).
 *
 * TODO(auth): not wired into src/proxy.ts yet. Wire it in with the auth work, after the
 * next-intl middleware has produced `response`. No queries here; session refresh only.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validates the JWT with Supabase Auth and refreshes it if needed. Do not trust getSession().
  await supabase.auth.getUser();
  return response;
}
