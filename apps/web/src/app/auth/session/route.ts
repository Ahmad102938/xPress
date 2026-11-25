import { createHmac } from "node:crypto";
import { firstName, maskEmail, maskPhone } from "@acurexpress/core";
import { hasSupabaseEnv, type User } from "@acurexpress/db";
import { createClient } from "@acurexpress/db/server";
import { authState, initialsOf, type GateState } from "@/features/auth/server/auth-state";
import { hmacSecret } from "@/features/auth/server/rate-limit";
import { loadProfileContext } from "@/features/profiles/server/selected-profile";

/**
 * Header session state for the client island (docs/specs/auth.md item 26; signed-in-home item 35).
 * Never cached. Never returns unmasked contact details, a user id or a photo URL (initials only):
 * the gate state, the first name, a masked contact, an opaque per-user tag (for the Back-button
 * guard), the active profiles' first names and relationships, the selected profile and an address
 * chip (label and PIN). Fails safe to signed_out.
 */
export interface SessionProfileView {
  id: string;
  firstName: string;
  relationship: string;
}

export interface SessionView {
  state: GateState;
  name: string | null;
  initials: string;
  maskedContact: string | null;
  userTag: string | null;
  profiles: SessionProfileView[];
  selectedProfileId: string | null;
  addressChip: { label: string; pin: string } | null;
}

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

const SIGNED_OUT: SessionView = {
  state: "signed_out",
  name: null,
  initials: "",
  maskedContact: null,
  userTag: null,
  profiles: [],
  selectedProfileId: null,
  addressChip: null,
};

/** Opaque and stable per user, but not the id: tells "same person" from "someone else". */
export function userTagFor(userId: string): string {
  return createHmac("sha256", hmacSecret()).update(`session:${userId}`).digest("hex").slice(0, 32);
}

export function maskedContactFor(
  user: Pick<User, "phone" | "phone_confirmed_at" | "email" | "email_confirmed_at">,
): string | null {
  if (user.phone && user.phone_confirmed_at) return maskPhone(`+${user.phone.replace(/^\+/, "")}`);
  if (user.email && user.email_confirmed_at) return maskEmail(user.email);
  return null;
}

export async function GET() {
  let view: SessionView = SIGNED_OUT;
  try {
    if (!hasSupabaseEnv()) return Response.json(view, { headers: NO_STORE });
    const supabase = await createClient();
    const auth = await authState(supabase);
    if (auth.state !== "signed_in" || !auth.user) {
      view = { ...SIGNED_OUT, state: auth.state };
    } else {
      const { active, selected } = await loadProfileContext(supabase, auth.user.id);
      let addressChip: SessionView["addressChip"] = null;
      if (selected) {
        const { data } = await supabase
          .from("patient_addresses")
          .select("label, pincode")
          .eq("patient_profile_id", selected.profile.id)
          .eq("is_default", true)
          .maybeSingle();
        addressChip = data ? { label: data.label, pin: data.pincode } : null;
      }
      view = {
        state: "signed_in",
        name: firstName(auth.fullName),
        initials: initialsOf(auth.fullName),
        maskedContact: maskedContactFor(auth.user),
        userTag: userTagFor(auth.user.id),
        profiles: active.map((profile) => ({
          id: profile.id,
          firstName: firstName(profile.fullName) ?? "",
          relationship: profile.relationship,
        })),
        selectedProfileId: selected?.profile.id ?? null,
        addressChip,
      };
    }
  } catch {
    // Fail safe: the header shows the Login button.
    view = SIGNED_OUT;
  }
  return Response.json(view, { headers: NO_STORE });
}
