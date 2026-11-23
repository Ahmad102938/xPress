import type { ClinicSummary } from "./types";

/**
 * SAMPLE DATA. Fictional clinics and areas for UI development only.
 * Ratings are placeholders and are labelled as sample on screen.
 */
export const sampleClinics: readonly ClinicSummary[] = [
  {
    id: "sample-clinic-1",
    name: "Sample Care Clinic",
    area: "Example Nagar",
    doctorsCount: 4,
    modes: ["clinic", "online"],
  },
  {
    id: "sample-clinic-2",
    name: "Demo Family Clinic",
    area: "Placeholder Colony",
    doctorsCount: 2,
    modes: ["clinic"],
  },
  {
    id: "sample-clinic-3",
    name: "Example Health Centre",
    area: "Test Market Road",
    doctorsCount: 6,
    modes: ["clinic", "online"],
  },
  {
    id: "sample-clinic-4",
    name: "Mock Multispeciality Clinic",
    area: "Sample Chowk",
    doctorsCount: 9,
    modes: ["clinic"],
  },
];
