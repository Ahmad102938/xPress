/**
 * Company details shown in the patient-site footer (and later on the contact and grievance pages).
 *
 * Every value that HCQ Care has not confirmed yet starts with TODO_HCQ. Such values are shown only
 * in development (so the layout can be reviewed) and are HIDDEN in production builds, so nothing
 * invented ever ships. Replace a placeholder with the real value to make it appear everywhere.
 * Do not put guesses here: no sample phone numbers, addresses, CIN/GST numbers or social handles.
 */

export const PLACEHOLDER_PREFIX = "TODO_HCQ";

export const company = {
  /** From the brief. Also used in the copyright line (messages: footer.copyright). */
  legalName: "HCQ Care Private Limited",
  registeredOffice: "TODO_HCQ: confirm registered office address",
  cin: "TODO_HCQ: confirm CIN",
  gstin: "TODO_HCQ: confirm GSTIN",
  support: {
    email: "TODO_HCQ: confirm support email",
    phone: "TODO_HCQ: confirm support phone number",
    hours: "TODO_HCQ: confirm support hours",
  },
  /** Not shown in the footer yet; for the grievance page (consumer and IT rules). */
  grievanceOfficer: {
    name: "TODO_HCQ: confirm grievance officer name",
    email: "TODO_HCQ: confirm grievance officer email",
  },
  /** Only networks with a real URL are shown. Leave null until HCQ Care confirms the account. */
  social: {
    facebook: null,
    instagram: null,
    x: null,
    linkedin: null,
    youtube: null,
  } as Record<"facebook" | "instagram" | "x" | "linkedin" | "youtube", string | null>,
  /** "Secure online payments" appears in the footer only once payments are live. */
  paymentsEnabled: false,
  /**
   * The emergency and medical disclaimer is always shown (safety). Its final legal wording is
   * pending: TODO_HCQ: confirm the wording of footer.disclaimer and footer.disclaimerConsult.
   */
  disclaimerWordingStatus: "TODO_HCQ: confirm final disclaimer wording",
} as const;

export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || value.trim().startsWith(PLACEHOLDER_PREFIX);
}

/** Placeholders are visible only in development builds. */
export function showPlaceholders(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "development";
}

/** The value to display, or null when it is a placeholder that must stay hidden. */
export function displayValue(value: string | null | undefined, placeholdersVisible: boolean) {
  if (!value) return null;
  if (isPlaceholder(value)) return placeholdersVisible ? value : null;
  return value;
}
