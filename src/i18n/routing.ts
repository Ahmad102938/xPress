import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  // English stays at /doctors; Hindi lives at /hi/doctors. Keeps English URLs clean and
  // gives Hindi pages their own indexable URLs.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
