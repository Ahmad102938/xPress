import type { User } from "@acurexpress/db";
import { maskEmail } from "@acurexpress/core";
import { hasSupabaseEnv } from "@acurexpress/db";
import { createClient } from "@acurexpress/db/server";

/**
 * The one gate (docs/specs/auth.md "Gate logic", R2-B1, Build decisions). Order:
 *   1. no user                              -> signed_out
 *   2. no profile or no current Terms      -> needs_finish
 *   3. this session pending or stale (90d)  -> step_up
 *   4. otherwise                            -> signed_in
 * touch_last_seen() runs first so a stale session is recorded as pending before anything else.
 * If the gate itself cannot be read (database error), the state is `unavailable`, never
 * `needs_finish`: a database incident must not send every patient to Finish sign-up
 * (docs/specs/signed-in-home.md item 35).
 */

export type GateState = "signed_out" | "needs_finish" | "step_up" | "signed_in" | "unavailable";

export interface GateInput {
  hasUser: boolean;
  hasProfile: boolean;
  hasCurrentTerms: boolean;
  needsStepUp: boolean;
}

export function decideGate(input: GateInput): GateState {
  if (!input.hasUser) return "signed_out";
  if (!input.hasProfile || !input.hasCurrentTerms) return "needs_finish";
  if (input.needsStepUp) return "step_up";
  return "signed_in";
}

export interface AuthState {
  state: GateState;
  user: User | null;
  fullName: string | null;
  /** Google photo (https only) for the user menu; null otherwise. */
  avatarUrl: string | null;
  /** Step-up options for this account: masked email to send a code to, and whether Google exists. */
  stepUp: { maskedEmail: string | null; google: boolean };
}

const SIGNED_OUT: AuthState = {
  state: "signed_out",
  user: null,
  fullName: null,
  avatarUrl: null,
  stepUp: { maskedEmail: null, google: false },
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

interface MyAuthState {
  has_profile?: boolean;
  has_current_terms?: boolean;
  full_name?: string | null;
  needs_step_up?: boolean;
}

function avatarFrom(user: User): string | null {
  const value: unknown = user.user_metadata?.avatar_url;
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

export async function authState(client?: ServerClient): Promise<AuthState> {
  if (!hasSupabaseEnv()) return SIGNED_OUT;
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  if (!user) return SIGNED_OUT;

  const touched = await supabase.rpc("touch_last_seen");
  const { data: raw, error: gateError } = await supabase.rpc("my_auth_state");
  if (touched.error || gateError) {
    // Error code only, never ids or names.
    console.error(`[auth] gate unavailable (${(gateError ?? touched.error)?.code ?? "unknown"})`);
    return { ...SIGNED_OUT, state: "unavailable", user };
  }
  const gate = (raw ?? {}) as MyAuthState;

  const providers = new Set((user.identities ?? []).map((identity) => identity.provider));
  const confirmedEmail = user.email && user.email_confirmed_at ? user.email : null;

  return {
    state: decideGate({
      hasUser: true,
      hasProfile: gate.has_profile === true,
      hasCurrentTerms: gate.has_current_terms === true,
      needsStepUp: gate.needs_step_up === true,
    }),
    user,
    fullName: gate.full_name ?? null,
    avatarUrl: avatarFrom(user),
    stepUp: {
      maskedEmail: confirmedEmail ? maskEmail(confirmedEmail) : null,
      google: providers.has("google"),
    },
  };
}

/** Initials for the user menu (Latin or Devanagari), never more than two characters. */
export function initialsOf(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters
    .map((part) => Array.from(part ?? "")[0] ?? "")
    .join("")
    .toUpperCase();
}
