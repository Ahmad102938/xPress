import { cache } from "react";
import { cookies } from "next/headers";
import type { Database } from "@acurexpress/db";
import type { ServerClient } from "@/features/auth/server/profile-guard";
import { PROFILE_COOKIE } from "./profile-cookie";

/**
 * Patient profiles the signed-in account may act for, and the selected one
 * (docs/specs/signed-in-home.md item 38). Everything is read with the user's own session, so RLS
 * (actable_profile_ids) decides what exists; the cookie is only a preference.
 */

type ProfileRow = Database["public"]["Tables"]["patient_profiles"]["Row"];
type Relationship = Database["public"]["Enums"]["profile_relationship"];

export interface PatientProfile {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: ProfileRow["gender"];
  consultationLanguage: string | null;
  contactPhone: string | null;
  relationship: Relationship;
  archived: boolean;
  isSelf: boolean;
}

export interface SelectedProfile {
  profile: PatientProfile;
  /** True only when a cookie was present but pointed at nothing usable (archived, forged, gone). */
  fellBack: boolean;
}

function toProfile(row: ProfileRow, relationship: Relationship): PatientProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    consultationLanguage: row.consultation_language,
    contactPhone: row.contact_phone,
    relationship,
    archived: row.archived_at !== null,
    isSelf: relationship === "self",
  };
}

/** All profiles the account can read (archived included), self first, then by name. */
export async function listProfiles(
  supabase: ServerClient,
  accountId: string,
): Promise<PatientProfile[]> {
  const [{ data: grants }, { data: rows }] = await Promise.all([
    supabase
      .from("profile_access")
      .select("patient_profile_id, relationship")
      .eq("account_id", accountId)
      .is("revoked_at", null),
    supabase.from("patient_profiles").select("*"),
  ]);
  const relationships = new Map(
    (grants ?? []).map((grant) => [grant.patient_profile_id, grant.relationship]),
  );
  return (rows ?? [])
    .filter((row) => relationships.has(row.id))
    .map((row) => toProfile(row, relationships.get(row.id) ?? "other"))
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.fullName.localeCompare(b.fullName));
}

/** Pure choice: the cookie's profile if it is usable, else self. */
export function chooseSelected(
  profiles: PatientProfile[],
  cookieValue: string | undefined,
): SelectedProfile | null {
  const self = profiles.find((profile) => profile.isSelf);
  if (!self) return null;
  if (!cookieValue) return { profile: self, fellBack: false };
  const chosen = profiles.find((profile) => profile.id === cookieValue && !profile.archived);
  return chosen ? { profile: chosen, fellBack: false } : { profile: self, fellBack: true };
}

/** Per request: the account's profiles and the selected one. */
export const loadProfileContext = cache(async (supabase: ServerClient, accountId: string) => {
  const profiles = await listProfiles(supabase, accountId);
  const selected = chooseSelected(profiles, (await cookies()).get(PROFILE_COOKIE)?.value);
  return { profiles, active: profiles.filter((profile) => !profile.archived), selected };
});
