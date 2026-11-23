import type { FlagName, Flags } from "@acurexpress/core";

/**
 * Patient-site footer links, in one typed place so a CMS can drive them later (Brief §14).
 * - `href` is an internal path on apps/web (locale prefix is added by the i18n Link).
 * - `flag`: shown only while that feature flag is on (flag-off links are hidden, not greyed out).
 * - `signedIn`: the page needs a signed-in user, so the link goes through the login page with a
 *   return path (same `?next=` convention as Book buttons).
 * Partners are NOT a column here: they get the separate partner band (config/partner-band.ts).
 */
export type FooterLinkKey =
  | "doctors"
  | "clinics"
  | "consult"
  | "shops"
  | "medicines"
  | "uploadPrescription"
  | "healthAssistant"
  | "login"
  | "appointments"
  | "account"
  | "trackOrder"
  | "help"
  | "contact"
  | "complaint"
  | "refundStatus"
  | "about"
  | "trust"
  | "accessibility"
  | "terms"
  | "privacy"
  | "refundPolicy"
  | "grievance"
  | "dataRights"
  | "consent";

export interface FooterLink {
  key: FooterLinkKey;
  href: string;
  flag?: FlagName;
  signedIn?: boolean;
}

export type FooterGroupKey = "findCare" | "account" | "help" | "legal";

export interface FooterGroup {
  key: FooterGroupKey;
  links: readonly FooterLink[];
}

export const footerGroups: readonly FooterGroup[] = [
  {
    key: "findCare",
    links: [
      { key: "doctors", href: "/doctors" },
      { key: "clinics", href: "/clinics" },
      { key: "consult", href: "/consult" },
      { key: "shops", href: "/shops", flag: "shopNetwork" },
      { key: "medicines", href: "/medicines", flag: "medicineSales" },
      { key: "uploadPrescription", href: "/prescriptions/upload", flag: "medicineSales" },
      { key: "healthAssistant", href: "/health-assistant", flag: "aiConsultant" },
    ],
  },
  {
    key: "account",
    links: [
      { key: "login", href: "/login" },
      { key: "appointments", href: "/appointments", signedIn: true },
      { key: "account", href: "/account", signedIn: true },
      { key: "trackOrder", href: "/orders", flag: "medicineSales", signedIn: true },
    ],
  },
  {
    key: "help",
    links: [
      { key: "help", href: "/help" },
      { key: "contact", href: "/contact" },
      { key: "complaint", href: "/contact?topic=complaint" },
      { key: "refundStatus", href: "/help/refunds" },
      { key: "about", href: "/about" },
      { key: "trust", href: "/trust" },
      { key: "accessibility", href: "/accessibility" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "terms", href: "/terms" },
      { key: "privacy", href: "/privacy" },
      { key: "refundPolicy", href: "/refund-policy" },
      { key: "grievance", href: "/grievance" },
      { key: "dataRights", href: "/data-rights" },
      { key: "consent", href: "/account/privacy", signedIn: true },
    ],
  },
];

/** Icon links in the bottom bar (the partner link is added separately, see config/partner-band.ts). */
export const bottomBarLinks: readonly { key: "help" | "contact" | "sitemap"; href: string }[] = [
  { key: "help", href: "/help" },
  { key: "contact", href: "/contact" },
  { key: "sitemap", href: "/sitemap" },
];

/** Link target: signed-in pages go through login with the original path as the return path. */
export function footerHref(link: FooterLink): string {
  return link.signedIn ? `/login?next=${encodeURIComponent(link.href)}` : link.href;
}

/** Groups with flag-off links removed. */
export function visibleFooterGroups(flags: Flags): FooterGroup[] {
  return footerGroups.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.flag || flags[link.flag]),
  }));
}
