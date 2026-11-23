import { describe, expect, it } from "vitest";
import { hasPlaceholderLegalVersions, isPlaceholderLegalVersion, LEGAL_VERSIONS } from "./legal";

describe("LEGAL_VERSIONS", () => {
  it("matches the versions seeded in public.legal_versions", () => {
    expect(LEGAL_VERSIONS).toEqual({ terms_privacy: "draft-2026-11", marketing: "draft-2026-11" });
  });
});

describe("placeholder detection", () => {
  it("treats draft- versions as placeholders", () => {
    expect(isPlaceholderLegalVersion("draft-2026-11")).toBe(true);
    expect(isPlaceholderLegalVersion("2027-01")).toBe(false);
  });

  it("reports placeholders while any document is a draft", () => {
    expect(hasPlaceholderLegalVersions()).toBe(true);
    expect(hasPlaceholderLegalVersions({ terms_privacy: "2027-01", marketing: "draft-1" })).toBe(
      true,
    );
    expect(hasPlaceholderLegalVersions({ terms_privacy: "2027-01", marketing: "2027-01" })).toBe(
      false,
    );
  });
});
