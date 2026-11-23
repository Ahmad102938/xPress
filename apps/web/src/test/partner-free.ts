/**
 * What may and may not appear on the patient site (apps/web). Used by unit and e2e tests.
 * - Partner wording and partner links: ONLY inside the footer partner band ([data-partner-band]),
 *   and only to the configured partner base URL.
 * - Admin wording, hosts and paths: NEVER, anywhere on web (including the partner band).
 */

/** Visible text that would advertise the partner or admin apps (English and Hindi). */
export const PARTNER_TEXT: readonly RegExp[] = [
  /partner/i,
  /\badmin\b/i,
  /become a/i,
  /join as a/i,
  /list your clinic/i,
  /register your shop/i,
  /grow your practice/i,
  /for doctors/i,
  /for clinics/i,
  /for medical shops/i,
  /HCQ staff/i,
  /पार्टनर/,
  /एडमिन/,
  /के रूप में जुड़ें/,
  /क्लिनिक लिस्ट करें/,
  /शॉप रजिस्टर करें/,
  /प्रैक्टिस बढ़ाएँ/,
  /डॉक्टरों के लिए/,
  /क्लिनिक के लिए/,
  /मेडिकल शॉप के लिए/,
];

/** Link targets that lead to the partner or admin apps, or to the removed partner stubs. */
export const PARTNER_HREF: readonly RegExp[] = [
  /\/\/partners?\./i,
  /\/\/admin\./i,
  /^(?:\/hi)?\/(?:partners?|admin)(?:[/?#]|$)/i,
  /^(?:\/hi)?\/for-(?:doctors|clinics|shops)(?:[/?#]|$)/i,
];

export function partnerTextFound(text: string): string[] {
  return PARTNER_TEXT.filter((re) => re.test(text)).map(String);
}

export function partnerHrefsFound(hrefs: readonly string[]): string[] {
  return hrefs.filter((href) => PARTNER_HREF.some((re) => re.test(href)));
}

/** Admin wording: never allowed anywhere on web. */
export const ADMIN_TEXT: readonly RegExp[] = [/\badmin\b/i, /एडमिन/, /HCQ staff/i];

/** Admin hosts and paths: never allowed anywhere on web. */
export const ADMIN_HREF: readonly RegExp[] = [/\/\/admin\./i, /^(?:\/hi)?\/admin(?:[/?#]|$)/i];

export function adminTextFound(text: string): string[] {
  return ADMIN_TEXT.filter((re) => re.test(text)).map(String);
}

export function adminHrefsFound(hrefs: readonly string[]): string[] {
  return hrefs.filter((href) => ADMIN_HREF.some((re) => re.test(href)));
}
