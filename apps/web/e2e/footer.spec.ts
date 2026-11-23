import { expect, test } from "@playwright/test";
import { E2E_PARTNER_URL } from "../playwright.config";

/**
 * Footer: every internal footer link resolves (no 404 or error), at 360 and 1280, in English and
 * Hindi. Cross-site partner links are checked by href only. Accordions work by keyboard on mobile.
 */
const LOCALES = [
  { name: "en", home: "/" },
  { name: "hi", home: "/hi" },
] as const;

for (const width of [360, 1280]) {
  for (const locale of LOCALES) {
    test(`footer links resolve: ${locale.name} at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(locale.home);
      const footer = page.locator("footer");
      const { internal, partner, switcher } = await footer.evaluate((el) => {
        const band = el.querySelector("[data-partner-band]");
        const links = [...el.querySelectorAll<HTMLAnchorElement>("a[href]")];
        return {
          internal: links
            .filter((a) => !band?.contains(a))
            .map((a) => a.getAttribute("href") ?? "")
            .filter((href) => href.startsWith("/")),
          partner: links.filter((a) => band?.contains(a)).map((a) => a.getAttribute("href") ?? ""),
          // Language switcher links (lang attribute) intentionally point to the other locale.
          switcher: links
            .filter((a) => a.hasAttribute("lang"))
            .map((a) => a.getAttribute("href") ?? ""),
        };
      });

      expect(partner).toEqual([E2E_PARTNER_URL]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

      const unique = [...new Set(internal)];
      expect(unique.length).toBeGreaterThanOrEqual(20);
      for (const href of unique) {
        if (locale.name === "hi" && !switcher.includes(href)) {
          expect(href.startsWith("/hi"), href).toBe(true);
        }
        const response = await page.goto(href);
        expect(response?.status(), href).toBe(200);
        // Unknown routes stream the not-found page with status 200, so also check what renders.
        await expect(page.getByText("This page could not be found"), href).toHaveCount(0);
        await expect(page.locator("main h1").first(), href).toBeVisible();
      }
    });
  }
}

test("mobile: footer groups are accordions that open and close with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Your account" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const login = page.locator("footer").getByRole("link", { name: "Login or Sign up" });
  await expect(login).toBeHidden();

  const box = await toggle.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(login).toBeVisible();

  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(login).toBeHidden();

  // The emergency disclaimer and the bottom bar (with "Become a partner") are never collapsed.
  await expect(page.getByText("A-CureXpress does not provide emergency care.")).toBeVisible();
  await expect(
    page.locator("footer").getByRole("link", { name: /Become a partner/ }),
  ).toBeVisible();
});

test("desktop: all five footer columns are open, no accordion buttons", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("button", { name: "Find care" })).toBeHidden();
  for (const name of ["Doctors", "Login or Sign up", "Help centre and FAQs", "Terms of use"]) {
    await expect(footer.getByRole("link", { name, exact: true }).first()).toBeVisible();
  }
});

test("back to top returns to the top and moves focus to the skip link", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(10);
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});
