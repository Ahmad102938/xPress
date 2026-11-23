/**
 * Current legal document versions. Must equal the rows in public.legal_versions (migration
 * 20261123113135_foundation.sql); tests on both sides pin the values.
 *
 * TODO(HCQ): placeholders until HCQ supplies the real Terms and Privacy documents. While any
 * version is a placeholder, production hides sign-in (docs/specs/auth.md R1-B5, R2-M5).
 */
export const LEGAL_VERSIONS = {
  terms_privacy: "draft-2026-11",
  marketing: "draft-2026-11",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;

/** A version is a placeholder while it starts with "draft-". */
export function isPlaceholderLegalVersion(version: string): boolean {
  return version.startsWith("draft-");
}

export function hasPlaceholderLegalVersions(
  versions: Readonly<Record<LegalDocument, string>> = LEGAL_VERSIONS,
): boolean {
  return Object.values(versions).some(isPlaceholderLegalVersion);
}
