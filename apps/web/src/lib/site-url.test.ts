import { describe, expect, it } from "vitest";
import { absoluteUrl, siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL and keeps only the origin", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://acurexpress.com/some/path" })).toBe(
      "https://acurexpress.com",
    );
  });

  it("falls back to localhost when not deployed", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
  });

  it("is required on Vercel", () => {
    expect(() => siteUrl({ VERCEL: "1" })).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("rejects other schemes", () => {
    expect(() => siteUrl({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" })).toThrow();
  });
});

describe("absoluteUrl", () => {
  it("joins a sanitised path onto the site origin", () => {
    expect(
      absoluteUrl("/auth/callback?flow=link", { NEXT_PUBLIC_SITE_URL: "http://localhost:3200" }),
    ).toBe("http://localhost:3200/auth/callback?flow=link");
  });
});
