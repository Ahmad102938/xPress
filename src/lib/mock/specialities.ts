import type { Speciality } from "./types";

/** All specialities. The Home page shows the first eight. */
export const specialities: readonly Speciality[] = [
  { slug: "general-physician" },
  { slug: "paediatrics" },
  { slug: "gynaecology" },
  { slug: "dermatology" },
  { slug: "orthopaedics" },
  { slug: "ent" },
  { slug: "dental" },
  { slug: "cardiology" },
  { slug: "eye-care" },
  { slug: "psychiatry" },
];

export const HOME_SPECIALITY_COUNT = 8;
