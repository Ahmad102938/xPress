/**
 * Types for the static mock data used by the signed-out Home page.
 * These are UI view models, not database rows. They will be replaced by generated Supabase types
 * and server-side views (doctor visibility and badge logic lives in the database, §24 rule 4).
 */

export type ConsultationMode = "online" | "clinic";

/** Public badge. Only these two levels exist; pending/rejected/suspended doctors are never listed. */
export type BadgeType = "verified" | "registered";

export type SpecialitySlug =
  | "general-physician"
  | "paediatrics"
  | "gynaecology"
  | "dermatology"
  | "orthopaedics"
  | "ent"
  | "dental"
  | "cardiology"
  | "eye-care"
  | "psychiatry";

export interface Speciality {
  slug: SpecialitySlug;
}

export interface DoctorSummary {
  id: string;
  /** Provider-entered content is shown as entered (D16), so names are not translated. */
  name: string;
  speciality: SpecialitySlug;
  experienceYears: number;
  /** BCP 47 language codes; display names come from Intl.DisplayNames. */
  languages: readonly string[];
  /** Whole rupees. Sample value only. */
  feeInr: number;
  modes: readonly ConsultationMode[];
  nextSlot: { day: "today" | "tomorrow"; time: `${number}:${number}` };
  badge: BadgeType;
}

export interface ClinicSummary {
  id: string;
  name: string;
  area: string;
  doctorsCount: number;
  rating: number;
  ratingCount: number;
  modes: readonly ConsultationMode[];
}

export type TrustStatKey = "verifiedDoctors" | "partnerClinics" | "pilotDistricts" | "privacy";

export interface TrustStatItem {
  key: TrustStatKey;
  /** Display value. `null` means a statement without a number (e.g. "Secure and private"). */
  value: string | null;
  /** PLACEHOLDER: true until the figure comes from live data (hard rule 7: no fabricated counts). */
  isPlaceholder: boolean;
}
