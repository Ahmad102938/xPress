/**
 * Static mock data for the signed-out Home page. Everything here is SAMPLE content.
 * TODO(db): replace with server-side queries against public views once migrations exist.
 */
export * from "./types";
export { sampleDoctors } from "./doctors";
export { sampleClinics } from "./clinics";
export { specialities, HOME_SPECIALITY_COUNT } from "./specialities";
export { trustStats } from "./trust";

/** Shown on screen next to sections that use sample data, so nothing reads as a real claim. */
export const IS_SAMPLE_DATA = true;
