import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

/**
 * SERVER-ONLY service-role client (`@acurexpress/db/admin`). It bypasses RLS, so it has exactly
 * four permitted uses (docs/specs/auth.md, Build decisions):
 *   1. the rate limiter (rateLimitHit, rateLimitReset),
 *   2. the daily cleanup job (rateLimitsCleanup, deleteAuthUser),
 *   3. the unconfirmed-user lookup (unconfirmedUsersOlderThan),
 *   4. server confirmation of an email-code step-up (completeStepUpServer).
 * Never use it to serve a signed-in user's own data (docs/SUPABASE.md §8 rule 9).
 * Test helpers (apps/web/e2e-auth) also use it against the LOCAL stack only.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The admin client is server-only.");
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing (server env only).");
  }
  const { url } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Counts one hit; true while the key is within `max` hits in its window. Throws on failure. */
export async function rateLimitHit(keyHash: string, windowSeconds: number, max: number) {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key_hash: keyHash,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) throw new Error("rate_limit_hit failed");
  return data === true;
}

/** Clears one key (used after a successful send, for that destination's verify key only). */
export async function rateLimitReset(keyHash: string) {
  const { error } = await createAdminClient().rpc("rate_limit_reset", { p_key_hash: keyHash });
  if (error) throw new Error("rate_limit_reset failed");
}

/** Deletes counters older than one day; returns how many were removed. */
export async function rateLimitsCleanup() {
  const { data, error } = await createAdminClient().rpc("rate_limits_cleanup");
  if (error) throw new Error("rate_limits_cleanup failed");
  return data ?? 0;
}

/** Ids of users who never confirmed an email or phone, older than `hours` (minimum 1). */
export async function unconfirmedUsersOlderThan(hours: number) {
  const { data, error } = await createAdminClient().rpc("unconfirmed_users_older_than", {
    p_age: `${Math.max(1, Math.floor(hours))} hours`,
  });
  if (error) throw new Error("unconfirmed_users_older_than failed");
  return (data ?? []) as string[];
}

/** Deletes one auth user through the Auth admin API (cleanup job only). */
export async function deleteAuthUser(userId: string) {
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error("deleteUser failed");
}

/** Server attestation after an email code was verified for this user and session. */
export async function completeStepUpServer(userId: string, sessionId: string) {
  const { error } = await createAdminClient().rpc("complete_step_up_server", {
    p_user_id: userId,
    p_session_id: sessionId,
  });
  if (error) throw new Error("complete_step_up_server failed");
}
