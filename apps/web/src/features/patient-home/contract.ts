import type { ClinicSummary, DoctorSummary, SpecialitySlug } from "@/lib/mock";

/**
 * The signed-in home data contract (docs/specs/signed-in-home.md item 49). Types only.
 *
 * Privacy rule (Product Context §25): cards show the doctor's speciality only. There is no field
 * for conditions, medicines, diagnoses or symptoms anywhere in this contract, so no card can show
 * one. Times are UTC ISO strings; the UI shows them in IST.
 */

/** Section ids, in page order. snake_case everywhere (outline, tests, fixture switch). */
export const HOME_SECTION_IDS = [
  "greeting",
  "complete_profile",
  "up_next",
  "needs_attention",
  "promo_banner",
  "continue_where_left",
  "your_doctors",
  "explore",
  "near_you",
  "shops_near_you",
  "ai_card",
  "help_support",
  "emergency_line",
] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type ConsultMode = "online" | "clinic";

/** A doctor as a home card may show them: name, speciality, id. Nothing about the patient. */
export interface DoctorRef {
  id: string;
  name: string;
  speciality: SpecialitySlug;
}

export interface UpNext {
  bookingId: string;
  doctor: DoctorRef;
  startsAt: string;
  mode: ConsultMode;
  /** Decided on the server from the mode and the time. */
  action: "join_call" | "get_directions" | "check_in";
  clinicName: string | null;
}

export interface PaymentPendingItem {
  kind: "payment_pending";
  bookingId: string;
  doctor: DoctorRef;
  /** From the server's slot hold. The only timer allowed on the page (no fake urgency). */
  holdExpiresAt: string;
}

export type AttentionItem = PaymentPendingItem;

export interface NearYou {
  doctors: readonly DoctorSummary[];
  clinics: readonly ClinicSummary[];
  /** Label of the selected profile's default address, else null (device PIN is shown instead). */
  place: string | null;
  /** True while doctors and clinics are labelled SAMPLE data (no tables yet). */
  sample: boolean;
}

export interface CompleteProfile {
  needsPhone: boolean;
  needsAddress: boolean;
}

export interface PatientHomeData {
  firstName: string | null;
  upNext: UpNext | null;
  attention: AttentionItem[];
  continue: { unfinishedBooking: { bookingId: string; doctor: DoctorRef } | null };
  yourDoctors: DoctorRef[];
  nearYou: NearYou;
  completeProfile: CompleteProfile;
}

/** What a source needs to know about the request. No patient data beyond what the home shows. */
export interface HomeContext {
  firstName: string | null;
  hasPhone: boolean;
  hasAddress: boolean;
  place: string | null;
  /** Dev fixture switches only (`__fixture_fail`, `__fixture_delay`); the real source ignores them. */
  searchParams: Record<string, string | string[] | undefined>;
}

/** Each section loads its own data, so one failing loader never blanks the page. */
export interface HomeSource {
  name: "real" | "dev-fixtures";
  /** Cheap existence checks for the outline. */
  presence(
    ctx: HomeContext,
  ): Promise<{ attention: boolean; yourDoctors: boolean; nearYou: boolean }>;
  upNext(ctx: HomeContext): Promise<UpNext | null>;
  attention(ctx: HomeContext): Promise<AttentionItem[]>;
  unfinishedBooking(ctx: HomeContext): Promise<PatientHomeData["continue"]["unfinishedBooking"]>;
  yourDoctors(ctx: HomeContext): Promise<DoctorRef[]>;
  nearYou(ctx: HomeContext): Promise<NearYou>;
}
