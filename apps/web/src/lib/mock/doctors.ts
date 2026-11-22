import type { DoctorSummary } from "./types";

/**
 * SAMPLE DATA. Obviously fake doctors for UI development only. Not real people.
 * Fees and slots are illustrative placeholders, not real prices or availability.
 */
export const sampleDoctors: readonly DoctorSummary[] = [
  {
    id: "sample-doc-1",
    name: "Dr. Asha Example",
    speciality: "general-physician",
    experienceYears: 12,
    languages: ["en", "hi"],
    feeInr: 400,
    modes: ["online", "clinic"],
    nextSlot: { day: "today", time: "16:30" },
    badge: "verified",
  },
  {
    id: "sample-doc-2",
    name: "Dr. Ravi Sample",
    speciality: "paediatrics",
    experienceYears: 8,
    languages: ["hi", "en"],
    feeInr: 500,
    modes: ["clinic"],
    nextSlot: { day: "today", time: "18:00" },
    badge: "verified",
  },
  {
    id: "sample-doc-3",
    name: "Dr. Neha Demo",
    speciality: "dermatology",
    experienceYears: 6,
    languages: ["en", "hi", "mr"],
    feeInr: 600,
    modes: ["online"],
    nextSlot: { day: "tomorrow", time: "10:15" },
    badge: "registered",
  },
  {
    id: "sample-doc-4",
    name: "Dr. Imran Placeholder",
    speciality: "orthopaedics",
    experienceYears: 15,
    languages: ["hi", "ur", "en"],
    feeInr: 700,
    modes: ["clinic", "online"],
    nextSlot: { day: "tomorrow", time: "11:00" },
    badge: "verified",
  },
  {
    id: "sample-doc-5",
    name: "Dr. Kavya Testcase",
    speciality: "gynaecology",
    experienceYears: 10,
    languages: ["en", "hi"],
    feeInr: 650,
    modes: ["online", "clinic"],
    nextSlot: { day: "today", time: "19:45" },
    badge: "registered",
  },
  {
    id: "sample-doc-6",
    name: "Dr. Arjun Mockup",
    speciality: "ent",
    experienceYears: 9,
    languages: ["hi", "en"],
    feeInr: 450,
    modes: ["clinic"],
    nextSlot: { day: "tomorrow", time: "09:30" },
    badge: "verified",
  },
];
