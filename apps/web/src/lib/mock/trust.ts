import type { TrustStatItem } from "./types";

/**
 * PLACEHOLDER FIGURES. Not real numbers. Hard rule 7: every number on screen must come from real
 * data before launch. Replace with values computed from the database (approved, visible records).
 */
export const trustStats: readonly TrustStatItem[] = [
  { key: "verifiedDoctors", value: "100+", isPlaceholder: true },
  { key: "listedClinics", value: "25+", isPlaceholder: true },
  { key: "pilotDistricts", value: "1", isPlaceholder: true },
  { key: "privacy", value: null, isPlaceholder: false },
];
