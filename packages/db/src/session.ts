import { getSupabasePublicEnv } from "./env";

/**
 * Revokes ONE session by its access token (docs/specs/signed-in-home.md item 16): Supabase Auth's
 * logout with scope=local signs out only the session the token belongs to. Used after a re-verify
 * replaced the session, so stale sessions do not pile up. No service role: the bearer is the
 * session's own token. Server-only. Never throws.
 */
export async function revokeSessionByToken(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<"ok" | "failed"> {
  if (typeof window !== "undefined") {
    throw new Error("revokeSessionByToken is server-only.");
  }
  if (!accessToken) return "failed";
  try {
    const { url, anonKey } = getSupabasePublicEnv();
    const response = await fetchImpl(`${url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
