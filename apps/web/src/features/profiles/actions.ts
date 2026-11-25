"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  addressUpsertInput,
  dependentInput,
  mapPatientProfileError,
  profileUpdateInput,
  uuidSchema,
  type PatientProfileErrorKey,
} from "@acurexpress/core";
import { within } from "@/features/auth/server/limiter";
import { profileGuard, type ServerClient } from "@/features/auth/server/profile-guard";
import { limiterKey } from "@/features/auth/server/rate-limit";
import { logAuthEvent } from "@/lib/log";
import {
  DISMISS_PROFILE_CARD_COOKIE,
  PROFILE_COOKIE,
  profileCookieOptions,
} from "./server/profile-cookie";

/**
 * Patient profile actions (docs/specs/signed-in-home.md item 39). Each one:
 *   1. needs a fully signed-in patient (profileGuard),
 *   2. validates with the core schemas,
 *   3. takes the patient profile id explicitly (never from the selected-profile cookie),
 *   4. counts the profile-write limit,
 *   5. calls the database function with the user's own session, which checks access again,
 *   6. returns a closed error key.
 */

export type ProfileActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { value: T }))
  | { ok: false; error: PatientProfileErrorKey; issue?: string };

type Ctx = { supabase: ServerClient; userId: string };

const uuid = uuidSchema;

async function guarded(): Promise<
  { ok: true; ctx: Ctx } | { ok: false; error: PatientProfileErrorKey }
> {
  const guard = await profileGuard();
  if (!guard.ok) return { ok: false, error: "unavailable" };
  const allowed = await within([
    { limit: "profileWritePerUser", key: limiterKey("profile-write-user", guard.userId) },
  ]);
  if (allowed === "error") return { ok: false, error: "unavailable" };
  if (!allowed) return { ok: false, error: "rate_limited" };
  return { ok: true, ctx: { supabase: guard.supabase, userId: guard.userId } };
}

function invalid(issue?: string) {
  return { ok: false as const, error: "invalid_input" as const, ...(issue ? { issue } : {}) };
}

function done(outcome: string) {
  logAuthEvent("profile.change", { outcome });
}

function refresh() {
  revalidatePath("/[locale]/profile", "page");
  revalidatePath("/[locale]/account", "page");
}

// ---- Dependents ---------------------------------------------------------------------------------

export async function createDependent(input: unknown): Promise<ProfileActionResult<string>> {
  const parsed = dependentInput().safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const g = await guarded();
  if (!g.ok) return g;
  const d = parsed.data;
  const { data, error } = await g.ctx.supabase.rpc("create_dependent", {
    p_full_name: d.fullName,
    p_date_of_birth: d.dateOfBirth,
    p_relationship: d.relationship,
    ...(d.gender ? { p_gender: d.gender } : {}),
    ...(d.consultationLanguage ? { p_consultation_language: d.consultationLanguage } : {}),
    ...(d.contactPhone ? { p_contact_phone: d.contactPhone } : {}),
    p_adult_permission: d.adultPermission,
  });
  if (error || !data) {
    const key = mapPatientProfileError(error);
    done(key);
    return { ok: false, error: key };
  }
  done("ok");
  refresh();
  return { ok: true, value: data };
}

/** An empty string clears an optional field; an absent field is left unchanged. */
export async function updatePatientProfile(input: unknown): Promise<ProfileActionResult> {
  const parsed = profileUpdateInput().safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const g = await guarded();
  if (!g.ok) return g;
  const d = parsed.data;
  const clear: string[] = [];
  if (d.dateOfBirth === "") clear.push("date_of_birth");
  if (d.gender === "") clear.push("gender");
  if (d.consultationLanguage === "") clear.push("consultation_language");
  if (d.contactPhone === null) clear.push("contact_phone");
  const { error } = await g.ctx.supabase.rpc("update_patient_profile", {
    p_profile_id: d.patientProfileId,
    ...(d.fullName ? { p_full_name: d.fullName } : {}),
    ...(d.dateOfBirth ? { p_date_of_birth: d.dateOfBirth } : {}),
    ...(d.gender ? { p_gender: d.gender } : {}),
    ...(d.consultationLanguage ? { p_consultation_language: d.consultationLanguage } : {}),
    ...(d.contactPhone ? { p_contact_phone: d.contactPhone } : {}),
    p_clear: clear,
    p_adult_permission: d.adultPermission,
  });
  if (error) {
    const key = mapPatientProfileError(error);
    done(key);
    return { ok: false, error: key };
  }
  done("ok");
  refresh();
  return { ok: true };
}

async function byId(
  fn: "archive_dependent" | "restore_dependent",
  id: unknown,
): Promise<ProfileActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return invalid();
  const g = await guarded();
  if (!g.ok) return g;
  const { error } = await g.ctx.supabase.rpc(fn, { p_profile_id: parsed.data });
  if (error) {
    const key = mapPatientProfileError(error);
    done(key);
    return { ok: false, error: key };
  }
  done("ok");
  refresh();
  return { ok: true };
}

export async function archiveDependent(patientProfileId: unknown) {
  return byId("archive_dependent", patientProfileId);
}

export async function restoreDependent(patientProfileId: unknown) {
  return byId("restore_dependent", patientProfileId);
}

// ---- Addresses ----------------------------------------------------------------------------------

export async function upsertAddress(input: unknown): Promise<ProfileActionResult<string>> {
  const parsed = addressUpsertInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const g = await guarded();
  if (!g.ok) return g;
  const d = parsed.data;
  const clear = [
    ...(d.addressId && !d.line2 ? ["line2"] : []),
    ...(d.addressId && !d.landmark ? ["landmark"] : []),
  ];
  const { data, error } = await g.ctx.supabase.rpc("upsert_patient_address", {
    p_profile_id: d.patientProfileId,
    p_label: d.label,
    p_line1: d.line1,
    p_city: d.city,
    p_state: d.state,
    p_pincode: d.pincode,
    ...(d.addressId ? { p_address_id: d.addressId } : {}),
    ...(d.line2 ? { p_line2: d.line2 } : {}),
    ...(d.landmark ? { p_landmark: d.landmark } : {}),
    p_clear: clear,
  });
  if (error || !data) {
    const key = mapPatientProfileError(error);
    done(key);
    return { ok: false, error: key };
  }
  done("ok");
  refresh();
  return { ok: true, value: data };
}

async function byAddress(
  fn: "delete_patient_address" | "set_default_address",
  id: unknown,
): Promise<ProfileActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return invalid();
  const g = await guarded();
  if (!g.ok) return g;
  const { error } = await g.ctx.supabase.rpc(fn, { p_address_id: parsed.data });
  if (error) {
    const key = mapPatientProfileError(error);
    done(key);
    return { ok: false, error: key };
  }
  done("ok");
  refresh();
  return { ok: true };
}

export async function deleteAddress(addressId: unknown) {
  return byAddress("delete_patient_address", addressId);
}

export async function setDefaultAddress(addressId: unknown) {
  return byAddress("set_default_address", addressId);
}

// ---- Selected profile and dismissed card (cookies only, no data change) ------------------------

/** Chooses which profile the screens show. Rejects an id the account cannot manage. */
export async function selectProfile(patientProfileId: unknown): Promise<ProfileActionResult> {
  const parsed = uuid.safeParse(patientProfileId);
  if (!parsed.success) return invalid();
  const guard = await profileGuard();
  if (!guard.ok) return { ok: false, error: "unavailable" };
  const { data, error } = await guard.supabase.rpc("can_act_for", {
    p_profile: parsed.data,
    p_capability: "manage",
  });
  if (error || data !== true) {
    logAuthEvent("profile.switch", { outcome: "not_found" });
    return { ok: false, error: "not_found" };
  }
  (await cookies()).set(PROFILE_COOKIE, parsed.data, profileCookieOptions());
  logAuthEvent("profile.switch", {
    outcome: "ok",
    requestId: (await headers()).get("x-request-id") ?? undefined,
  });
  return { ok: true };
}

/** Hides the "Complete your profile" card on this device. */
export async function dismissProfileCard(): Promise<{ ok: true }> {
  (await cookies()).set(DISMISS_PROFILE_CARD_COOKIE, "1", profileCookieOptions());
  return { ok: true };
}
