import type { Flags } from "@acurexpress/core";
import type { CompleteProfile, HomeSectionId } from "./contract";
import { HOME_SECTION_IDS } from "./contract";

export interface OutlineInput {
  presence: { attention: boolean; yourDoctors: boolean; nearYou: boolean };
  completeProfile: CompleteProfile;
  /** The "Complete your profile" card was dismissed on this device (cookie). */
  dismissed: boolean;
}

/**
 * Which sections render, in order (docs/specs/signed-in-home.md item 51, page order from the
 * Stitch redesign). Up next always renders (with "Book a visit" when empty). Sections with no data
 * are hidden, never shown as empty boxes. "Continue where you left off" is decided on the client
 * (its data lives on the device), so it is always in the outline and renders nothing when empty.
 * Static discovery blocks (promo banner, explore tiles, help) carry no user data and no numbers;
 * the shop map follows the shop-network flag and the AI band the AI flag.
 */
export function sectionsToRender(
  { presence, completeProfile, dismissed }: OutlineInput,
  flags: Flags,
): HomeSectionId[] {
  const show: Record<HomeSectionId, boolean> = {
    greeting: true,
    complete_profile: !dismissed && (completeProfile.needsPhone || completeProfile.needsAddress),
    up_next: true,
    needs_attention: presence.attention,
    promo_banner: true,
    continue_where_left: true,
    your_doctors: presence.yourDoctors,
    explore: true,
    near_you: presence.nearYou,
    shops_near_you: flags.shopNetwork,
    ai_card: flags.aiConsultant,
    help_support: true,
    emergency_line: true,
  };
  return HOME_SECTION_IDS.filter((id) => show[id]);
}
