import { describe, expect, it } from "vitest";
import { parseFlags } from "@acurexpress/core";
import { bottomBarLinks, footerGroups, footerHref, visibleFooterGroups } from "./footer-links";
import { findStub, isStubAvailable } from "./stub-pages";

// Real pages (not stubs). /login became a real page with sign-in (docs/specs/auth.md R1-M25).
const REAL_PAGES = new Set(["/", "/sitemap", "/login", "/appointments", "/account"]);
const pathOf = (href: string) => href.split("?")[0] ?? href;

describe("footer links config", () => {
  it("every internal footer link points at a real page or a stub (no dead links)", () => {
    const targets = [
      ...footerGroups.flatMap((g) => g.links.map((l) => l.href)),
      ...bottomBarLinks.map((l) => l.href),
    ];
    for (const href of targets) {
      const path = pathOf(href);
      expect(REAL_PAGES.has(path) || Boolean(findStub(path.slice(1))), href).toBe(true);
    }
  });

  it("a link's flag matches its page's flag, so a shown link never leads to a 404", () => {
    for (const link of footerGroups.flatMap((g) => g.links)) {
      const stub = findStub(pathOf(link.href).slice(1));
      if (stub && "flag" in stub) expect(link.flag, link.href).toBe(stub.flag);
    }
    const on = parseFlags({ FLAG_MEDICINE_SALES: "true", FLAG_AI_CONSULTANT: "true" });
    for (const link of visibleFooterGroups(on).flatMap((g) => g.links)) {
      const stub = findStub(pathOf(link.href).slice(1));
      if (stub) expect(isStubAvailable(stub, on), link.href).toBe(true);
    }
  });

  it("hides flag-off links", () => {
    const keys = visibleFooterGroups(parseFlags({})).flatMap((g) => g.links.map((l) => l.key));
    expect(keys).not.toContain("medicines");
    expect(keys).not.toContain("uploadPrescription");
    expect(keys).not.toContain("trackOrder");
    expect(keys).not.toContain("healthAssistant");
    expect(keys).toContain("shops");
  });

  it("signed-in links carry an encoded return path", () => {
    expect(footerHref({ key: "account", href: "/account", signedIn: true })).toBe(
      "/login?next=%2Faccount",
    );
    expect(footerHref({ key: "about", href: "/about" })).toBe("/about");
  });

  it("has no partner or admin links (partners get the separate band)", () => {
    const hrefs = footerGroups.flatMap((g) => g.links.map((l) => l.href));
    expect(hrefs.filter((h) => /partner|admin|for-(doctors|clinics|shops)/.test(h))).toEqual([]);
  });
});
