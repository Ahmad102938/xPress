import type { User } from "@acurexpress/db";
import { hasSupabaseEnv } from "@acurexpress/db";
import { createClient } from "@acurexpress/db/server";
import { authState } from "./auth-state";

/**
 * Guard for account and profile actions (docs/specs/signed-in-home.md item 39): a fully signed-in
 * patient only. A needs_finish, 90-day step_up or unavailable session is refused, as before.
 */
export type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type GuardResult =
  | { ok: true; supabase: ServerClient; userId: string; user: User }
  | { ok: false; error: "unavailable" };

export async function profileGuard(): Promise<GuardResult> {
  if (!hasSupabaseEnv()) return { ok: false, error: "unavailable" };
  const supabase = await createClient();
  const auth = await authState(supabase);
  if (auth.state !== "signed_in" || !auth.user) return { ok: false, error: "unavailable" };
  return { ok: true, supabase, userId: auth.user.id, user: auth.user };
}
