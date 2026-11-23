import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_PARTNER_URL } from "../playwright.config";
import {
  adminHrefsFound,
  adminTextFound,
  partnerHrefsFound,
  partnerTextFound,
} from "../src/test/partner-free";

/**
 * The patient site (apps/web) is patient-only. Partner wording and links are allowed ONLY inside
 * the footer partner band, and only to the configured partner base URL. Admin hosts, paths and
 * words never appear anywhere. Every main public page, at 360 and 1280, in English and Hindi.
 */
const PAGES = [
  "/",
  "/doctors",
  "/clinics",
  "/consult",
  "/shops",
  "/specialities",
  "/login",
  // /appointments and /account are guarded pages now (they redirect to /login, covered by e2e-auth).
  "/account/privacy",
  "/help",
  "/help/refunds",
  "/contact",
  "/about",
  "/trust",
  "/accessibility",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/grievance",
  "/data-rights",
  "/sitemap",
] as const;

const LOCALES = [
  { name: "en", prefix: "" },
  { name: "hi", prefix: "/hi" },
] as const;

/** Text (visible text, title, labels, alt, meta) and link targets: outside the band, in it, and in total. */
async function collect(page: Page) {
  return page.evaluate(() => {
    const band = document.querySelector<HTMLElement>("[data-partner-band]");
    const read = (root: HTMLElement, skip: HTMLElement | null) => {
      const keep = (el: Element) => !skip || !skip.contains(el);
      const attrs = [...root.querySelectorAll("[aria-label], [title], img[alt]")]
        .filter(keep)
        .flatMap((el) => ["aria-label", "title", "alt"].map((name) => el.getAttribute(name) ?? ""));
      const hrefs = [...root.querySelectorAll("a[href]")]
        .filter(keep)
        .map((a) => a.getAttribute("href") ?? "");
      skip?.setAttribute("hidden", "");
      const text = root.innerText;
      skip?.removeAttribute("hidden");
      return { text: [text, ...attrs].join("\n"), hrefs };
    };
    const head = [
      document.title,
      ...[...document.querySelectorAll('meta[name="description"], meta[property^="og:"]')].map(
        (m) => m.getAttribute("content") ?? "",
      ),
    ].join("\n");
    const all = read(document.body, null);
    const outside = read(document.body, band);
    return {
      all: { text: head + "\n" + all.text, hrefs: all.hrefs },
      outside: { text: head + "\n" + outside.text, hrefs: outside.hrefs },
      band: band ? read(band, null) : null,
    };
  });
}

for (const width of [360, 1280]) {
  for (const locale of LOCALES) {
    test.describe(`patient-only ${locale.name} at ${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });

      for (const path of PAGES) {
        const url = path === "/" ? locale.prefix || "/" : `${locale.prefix}${path}`;
        test(`${url}: partner content only in the footer band, admin nowhere`, async ({ page }) => {
          const response = await page.goto(url);
          expect(response?.status()).toBe(200);

          const { all, outside, band } = await collect(page);
          expect(partnerTextFound(outside.text), "partner wording outside the band").toEqual([]);
          expect(partnerHrefsFound(outside.hrefs), "partner links outside the band").toEqual([]);
          expect(band, "footer partner band").not.toBeNull();
          expect(band!.hrefs).toHaveLength(1);
          for (const href of band!.hrefs) expect(href.startsWith(E2E_PARTNER_URL), href).toBe(true);
          expect(adminTextFound(all.text), "admin wording").toEqual([]);
          expect(adminHrefsFound(all.hrefs), "admin links").toEqual([]);

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
          const serious = results.violations.filter(
            (v) => v.impact === "critical" || v.impact === "serious",
          );
          expect(serious.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
        });
      }
    });
  }
}

test("removed partner stubs and admin paths do not serve a page on web", async ({ page }) => {
  for (const path of [
    "/for-doctors",
    "/for-clinics",
    "/for-shops",
    "/partner",
    "/admin",
    "/hi/for-doctors",
  ]) {
    const response = await page.goto(path);
    const notFound =
      response?.status() === 404 ||
      (await page.getByText("This page could not be found").count()) > 0;
    expect(notFound, path).toBe(true);
  }
});
