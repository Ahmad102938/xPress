import { isDeployed } from "@acurexpress/db";

/**
 * The selected patient profile (docs/specs/signed-in-home.md "Selected profile"). A UI preference
 * only: it chooses what the screens show and never decides who an action is for. Every request
 * checks it again through RLS; a missing, archived or forged id falls back to the self profile.
 */
export const PROFILE_COOKIE = "acx_profile";

/** "Complete your profile" card dismissed on this device. No personal data. */
export const DISMISS_PROFILE_CARD_COOKIE = "acx_dismiss_profile_card";

export function profileCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isDeployed(),
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}
