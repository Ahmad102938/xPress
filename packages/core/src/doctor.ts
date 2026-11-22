/**
 * Public doctor badge (Addendum B, §25 "Status labels"). Only these two levels are ever shown;
 * pending, rejected and suspended doctors are never listed. Which badge a doctor gets is decided
 * on the server/database (§24 rule 4), never in UI code.
 */
export type BadgeType = "verified" | "registered";
