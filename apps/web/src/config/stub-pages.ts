import type { FlagName, Flags } from "@acurexpress/core";

/**
 * Public routes served by the "Coming soon" page (app/[locale]/(public)/[...slug]). A real page at
 * the same path takes precedence. Flagged stubs exist only while their flag is on (otherwise 404).
 * `key` is the message key in `pages` (and the title); legal pages also say the final text is
 * pending HCQ Care's legal review.
 */
export interface StubPage {
  path: string;
  key: string;
  flag?: FlagName;
  legal?: boolean;
}

export const STUB_PAGES = [
  { path: "doctors", key: "doctors" },
  { path: "clinics", key: "clinics" },
  { path: "consult", key: "consult" },
  { path: "shops", key: "shops", flag: "shopNetwork" },
  { path: "specialities", key: "specialities" },
  { path: "account/privacy", key: "account-privacy" },
  { path: "cart", key: "cart", flag: "medicineSales" },
  { path: "orders", key: "orders", flag: "medicineSales" },
  { path: "medicines", key: "medicines", flag: "medicineSales" },
  { path: "prescriptions/upload", key: "prescriptions-upload", flag: "medicineSales" },
  { path: "health-assistant", key: "health-assistant", flag: "aiConsultant" },
  { path: "help", key: "help" },
  { path: "help/refunds", key: "help-refunds" },
  { path: "contact", key: "contact" },
  { path: "about", key: "about" },
  { path: "trust", key: "trust" },
  { path: "accessibility", key: "accessibility" },
  { path: "terms", key: "terms", legal: true },
  { path: "privacy", key: "privacy", legal: true },
  { path: "refund-policy", key: "refund-policy", legal: true },
  { path: "grievance", key: "grievance", legal: true },
  { path: "data-rights", key: "data-rights", legal: true },
] as const satisfies readonly StubPage[];

export type StubKey = (typeof STUB_PAGES)[number]["key"];

export function findStub(path: string): StubPage | undefined {
  return STUB_PAGES.find((page) => page.path === path);
}

export function isStubAvailable(page: StubPage, flags: Flags): boolean {
  return !page.flag || flags[page.flag];
}
