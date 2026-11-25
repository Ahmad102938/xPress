import { z } from "zod";
import { fullNameSchema } from "./auth-schemas";

/**
 * Patient profile and address input rules (docs/specs/signed-in-home.md item 13). They mirror the
 * database functions in supabase/migrations/*_patient_profiles.sql, which stay the real check.
 * Issue messages are i18n keys.
 */

export const PROFILE_RELATIONSHIPS = [
  "self",
  "child",
  "parent",
  "spouse",
  "sibling",
  "grandparent",
  "other",
] as const;
export type ProfileRelationship = (typeof PROFILE_RELATIONSHIPS)[number];
export const DEPENDENT_RELATIONSHIPS = [
  "child",
  "parent",
  "spouse",
  "sibling",
  "grandparent",
  "other",
] as const;

export const PROFILE_GENDERS = ["female", "male", "other", "prefer_not_to_say"] as const;
export type ProfileGender = (typeof PROFILE_GENDERS)[number];

/** Error keys raised by the patient-profile database functions (errcode P0001), plus the app's own. */
export const PATIENT_PROFILE_ERROR = [
  "not_found",
  "invalid_input",
  "limit_reached",
  "self_profile",
  "adult_permission_required",
  "rate_limited",
  "unavailable",
] as const;
export type PatientProfileErrorKey = (typeof PATIENT_PROFILE_ERROR)[number];

const DB_KEYS = new Set<string>(PATIENT_PROFILE_ERROR.slice(0, 5));

/** Maps a PostgREST error from a profile RPC to a closed key. Anything unknown is "unavailable". */
export function mapPatientProfileError(
  error: { code?: string; message?: string } | null,
): PatientProfileErrorKey {
  if (error?.code === "P0001" && error.message && DB_KEYS.has(error.message)) {
    return error.message as PatientProfileErrorKey;
  }
  return "unavailable";
}

/** Today's date in India as YYYY-MM-DD. */
export function istDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Under 18 on `now` in IST, for an ISO date of birth. */
export function isMinor(dateOfBirth: string, now: Date): boolean {
  const [y, m, d] = istDate(now).split("-").map(Number) as [number, number, number];
  const adultCutoff = `${String(y - 18).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return dateOfBirth > adultCutoff;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "invalid_date" })
  // A round trip rejects dates that Date would roll over (2020-02-31 -> 2020-03-02).
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    },
    { message: "invalid_date" },
  );

/** A date of birth on or after 1900-01-01 and not after today (IST). `now` is injected for tests. */
export function dateOfBirthSchema(now: () => Date = () => new Date()) {
  return isoDate
    .refine((value) => value >= "1900-01-01", { message: "date_too_old" })
    .refine((value) => value <= istDate(now()), { message: "date_in_future" });
}

/** Optional contact number for a dependent: E.164, empty means none. */
export const contactPhoneSchema = z
  .string()
  .trim()
  .max(16)
  .refine((value) => value === "" || /^\+[0-9]{8,15}$/.test(value), { message: "invalid_phone" })
  .transform((value) => (value === "" ? null : value));

export function dependentInput(now: () => Date = () => new Date()) {
  return z.object({
    fullName: fullNameSchema,
    dateOfBirth: dateOfBirthSchema(now),
    relationship: z.enum(DEPENDENT_RELATIONSHIPS, { message: "invalid_relationship" }),
    gender: z.enum(PROFILE_GENDERS).nullable().default(null),
    consultationLanguage: z.enum(["en", "hi"]).nullable().default(null),
    contactPhone: contactPhoneSchema.nullable().default(null),
    adultPermission: z.boolean().default(false),
  });
}
export type DependentInput = z.output<ReturnType<typeof dependentInput>>;

export const addressInput = z.object({
  label: z.string().trim().min(1, { message: "required" }).max(30, { message: "too_long" }),
  line1: z.string().trim().min(2, { message: "required" }).max(120, { message: "too_long" }),
  line2: z.string().trim().max(120, { message: "too_long" }).default(""),
  landmark: z.string().trim().max(80, { message: "too_long" }).default(""),
  city: z.string().trim().min(2, { message: "required" }).max(60, { message: "too_long" }),
  state: z.string().trim().min(2, { message: "required" }).max(60, { message: "too_long" }),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, { message: "invalid_pincode" }),
});
export type AddressInput = z.output<typeof addressInput>;

export const uuidSchema = z.uuid({ message: "invalid_id" });

/** Profile edit: an absent field is unchanged; an empty string clears an optional field. */
export function profileUpdateInput(now: () => Date = () => new Date()) {
  return z.object({
    patientProfileId: uuidSchema,
    fullName: fullNameSchema.optional(),
    dateOfBirth: z.union([dateOfBirthSchema(now), z.literal("")]).optional(),
    gender: z.union([z.enum(PROFILE_GENDERS), z.literal("")]).optional(),
    consultationLanguage: z.union([z.enum(["en", "hi"]), z.literal("")]).optional(),
    contactPhone: contactPhoneSchema.optional(),
    adultPermission: z.boolean().default(false),
  });
}

export const addressUpsertInput = addressInput.extend({
  patientProfileId: uuidSchema,
  addressId: uuidSchema.optional(),
});
