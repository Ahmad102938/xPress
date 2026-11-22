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
    rating: 4.6,
    ratingCount: 120,
    modes: ["clinic", "online"],
  },
  {
    id: "sample-clinic-2",
    name: "Demo Family Clinic",
    area: "Placeholder Colony",
    doctorsCount: 2,
    rating: 4.3,
    ratingCount: 64,
    modes: ["clinic"],
  },
  {
    id: "sample-clinic-3",
    name: "Example Health Centre",
    area: "Test Market Road",
    doctorsCount: 6,
    rating: 4.8,
    ratingCount: 210,
    modes: ["clinic", "online"],
  },
  {
    id: "sample-clinic-4",
    name: "Mock Multispeciality Clinic",
    area: "Sample Chowk",
    doctorsCount: 9,
    rating: 4.1,
    ratingCount: 38,
    modes: ["clinic"],
  },
];
