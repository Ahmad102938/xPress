import type { FlagName } from "@acurexpress/core";

/**
 * Store claims strip directly below the Home hero ("trust strip").
 *
 * OWNER OVERRIDE (approved 2026-11-22, reconfirmed 2026-11-23): these four claims are kept exactly
 * as on the client's existing site, overriding the Product Context §25 note about not copying such
 * claims. They are NOT tied to the medicineSales flag (owner decision). Do not add new claims here.
 *
 * Claims supplied by the client's existing site. TODO_HCQ: confirm each claim can be honoured before
 * launch (delivery threshold, support hours, authenticity guarantee, price match).
 *
 * - Hide all four together: set `showStoreClaims` to false.
 * - Hide one: remove its entry from `trustClaims`.
 */
export const showStoreClaims = true;

/** Free-delivery threshold in rupees, shown as "On orders over ₹499". TODO_HCQ: confirm. */
export const FREE_DELIVERY_THRESHOLD_INR = 499;

export type TrustClaimId = "freeDelivery" | "support" | "authentic" | "bestPrices";

/** Icon set in components/brand/promise-icons.tsx. */
export type TrustClaimIcon = "truck" | "clock" | "shield" | "tag";

/** Icon colour (decorative; the text carries the meaning). */
export type TrustClaimTone = "blue" | "green" | "navy" | "red";

export interface TrustClaim {
  id: TrustClaimId;
  icon: TrustClaimIcon;
  tone: TrustClaimTone;
  /** Message keys in the `promises` namespace. */
  titleKey: `${TrustClaimId}.title`;
  subtitleKey: `${TrustClaimId}.body`;
  /** Optional feature flag; none of the current claims uses one (owner decision). */
  requiresFlag?: FlagName;
  /** Every store claim must be confirmed by HCQ Care before launch. */
  needsHcqConfirmation: true;
}

export const trustClaims: readonly TrustClaim[] = [
  {
    id: "freeDelivery",
    icon: "truck",
    tone: "blue",
    titleKey: "freeDelivery.title",
    subtitleKey: "freeDelivery.body",
    needsHcqConfirmation: true,
  },
  {
    id: "support",
    icon: "clock",
    tone: "green",
    titleKey: "support.title",
    subtitleKey: "support.body",
    needsHcqConfirmation: true,
  },
  {
    id: "authentic",
    icon: "shield",
    tone: "navy",
    titleKey: "authentic.title",
    subtitleKey: "authentic.body",
    needsHcqConfirmation: true,
  },
  {
    id: "bestPrices",
    icon: "tag",
    tone: "red",
    titleKey: "bestPrices.title",
    subtitleKey: "bestPrices.body",
    needsHcqConfirmation: true,
  },
];
