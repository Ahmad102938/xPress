import { sampleClinics, sampleDoctors } from "@/lib/mock";
import type { HomeSource } from "../contract";

/**
 * The real source (docs/specs/signed-in-home.md item 50). Booking, payment and doctor tables do
 * not exist yet, so those sections are empty and therefore hidden; nothing is invented (hard rule 7).
 * Near you uses the same labelled SAMPLE doctors and clinics as the public home until the doctors
 * module lands.
 * TODO(booking module): read bookings and slot holds for the selected patient profile via RLS.
 */
export const realSource: HomeSource = {
  name: "real",
  presence: async () => ({ attention: false, yourDoctors: false, nearYou: true }),
  upNext: async () => null,
  attention: async () => [],
  unfinishedBooking: async () => null,
  yourDoctors: async () => [],
  nearYou: async (ctx) => ({
    doctors: sampleDoctors,
    clinics: sampleClinics,
    place: ctx.place,
    sample: true,
  }),
};
