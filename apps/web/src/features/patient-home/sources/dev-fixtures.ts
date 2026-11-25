import { sampleClinics, sampleDoctors } from "@/lib/mock";
import type { DoctorRef, HomeContext, HomeSectionId, HomeSource } from "../contract";
import { HOME_SECTION_IDS } from "../contract";

/**
 * DEV-ONLY fixtures for previewing the full signed-in home (docs/specs/signed-in-home.md item 50).
 * Never used in production: get-source.ts only imports this file when NODE_ENV is not
 * "production" AND PATIENT_HOME_FIXTURES=1, and scripts/check-no-fixtures.mjs fails a build that
 * contains the marker below. Every name is visibly fake.
 */
export const FIXTURE_MARKER = "ACX_DEV_FIXTURE_DATA";

const doctorA: DoctorRef = {
  id: "fixture-doctor-a",
  name: "Dr. Test Sample",
  speciality: "general-physician",
};
const doctorB: DoctorRef = {
  id: "fixture-doctor-b",
  name: "Dr. Demo Example",
  speciality: "paediatrics",
};

function param(ctx: HomeContext, name: string): string | undefined {
  const value = ctx.searchParams[name];
  return Array.isArray(value) ? value[0] : value;
}

/** `__fixture_fail=<section id>` makes that section's loader throw; `__fixture_delay=<ms>` slows all. */
async function control(ctx: HomeContext, section: HomeSectionId): Promise<void> {
  const delay = Number(param(ctx, "__fixture_delay") ?? "0");
  if (Number.isFinite(delay) && delay > 0)
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10_000)));
  const fail = param(ctx, "__fixture_fail");
  if (fail && (HOME_SECTION_IDS as readonly string[]).includes(fail) && fail === section) {
    throw new Error(`${FIXTURE_MARKER}: forced failure for ${section}`);
  }
}

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

export const devFixtureSource: HomeSource = {
  name: "dev-fixtures",
  presence: async () => ({ attention: true, yourDoctors: true, nearYou: true }),
  upNext: async (ctx) => {
    await control(ctx, "up_next");
    return {
      bookingId: "00000000-0000-4000-8000-00000000f001",
      doctor: doctorA,
      startsAt: inMinutes(90),
      mode: "online",
      action: "join_call",
      clinicName: null,
    };
  },
  attention: async (ctx) => {
    await control(ctx, "needs_attention");
    return [
      {
        kind: "payment_pending",
        bookingId: "00000000-0000-4000-8000-00000000f002",
        doctor: doctorB,
        holdExpiresAt: inMinutes(7),
      },
    ];
  },
  unfinishedBooking: async (ctx) => {
    await control(ctx, "continue_where_left");
    return { bookingId: "00000000-0000-4000-8000-00000000f003", doctor: doctorB };
  },
  yourDoctors: async (ctx) => {
    await control(ctx, "your_doctors");
    return [doctorA, doctorB];
  },
  nearYou: async (ctx) => {
    await control(ctx, "near_you");
    return { doctors: sampleDoctors, clinics: sampleClinics, place: ctx.place, sample: true };
  },
};
