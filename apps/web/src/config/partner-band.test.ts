import { describe, expect, it } from "vitest";
import { DEV_PARTNER_URL, resolvePartnerBase, showPartnerBlock } from "./partner-band";

describe("partner link config", () => {
  it("is switched on by default", () => {
    expect(showPartnerBlock).toBe(true);
  });

  it("uses NEXT_PUBLIC_PARTNER_URL and drops a trailing slash", () => {
    expect(
      resolvePartnerBase({ url: "https://partners.acurexpress.com/", nodeEnv: "production" }),
    ).toBe("https://partners.acurexpress.com");
  });

  it("falls back to the local partner app in development only", () => {
    expect(resolvePartnerBase({ url: undefined, nodeEnv: "development" })).toBe(DEV_PARTNER_URL);
    expect(resolvePartnerBase({ url: undefined, nodeEnv: "production" })).toBeNull();
    expect(resolvePartnerBase({ url: "", nodeEnv: "production" })).toBeNull();
  });

  it("hides the link for invalid or non-http URLs, or when switched off", () => {
    expect(resolvePartnerBase({ url: "not a url", nodeEnv: "production" })).toBeNull();
    expect(resolvePartnerBase({ url: "javascript:alert(1)", nodeEnv: "production" })).toBeNull();
    expect(
      resolvePartnerBase({
        show: false,
        url: "https://partners.acurexpress.com",
        nodeEnv: "production",
      }),
    ).toBeNull();
  });
});
