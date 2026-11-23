import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Home look-and-feel checks: fold, accessibility, overflow, headline length, emergency bar. */
const LOCALES = [
  { name: "en", path: "/" },
  { name: "hi", path: "/hi" },
] as const;

for (const locale of LOCALES) {
  test(`${locale.name}: hero, store claims and the next section are above the fold at 1280x720`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(locale.path);
    const hero = await page.locator('[aria-roledescription="carousel"]').boundingBox();
    const strip = await page.locator("[data-trust-strip]").boundingBox();
    expect(hero!.height).toBeGreaterThanOrEqual(380);
    expect(hero!.height).toBeLessThanOrEqual(440);
    expect(hero!.y).toBeGreaterThanOrEqual(0);
    expect(strip!.y + strip!.height).toBeLessThanOrEqual(720);
    const next = await page
      .locator("[data-trust-strip]")
      .evaluate((el) => el.parentElement!.nextElementSibling!.getBoundingClientRect().top);
    expect(next).toBeLessThan(720);
  });

  for (const width of [360, 1280]) {
    test(`${locale.name} at ${width}px: axe clean, no horizontal scroll, headlines at most two lines`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(locale.path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

      const lines = await page.$$eval("[data-hero-slide] h2", (headings) =>
        headings.map((h) =>
          Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)),
        ),
      );
      expect(lines.length).toBeGreaterThanOrEqual(3);
      for (const n of lines) expect(n).toBeLessThanOrEqual(2);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });
  }
}

test("emergency notice: slim, and a dismissal is remembered for the session", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const bar = page.getByRole("note");
  await expect(bar).toContainText("In an emergency call 112");
  const box = await bar.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(40);

  await page.getByRole("button", { name: "Dismiss emergency notice" }).click();
  await expect(bar).toHaveCount(0);
  await page.goto("/doctors");
  await expect(page.getByRole("note")).toBeHidden();
});

test("clinic visit and online consultation look different in the category strip", async ({
  page,
}) => {
  await page.goto("/");
  const strip = page.getByRole("navigation", { name: "Browse categories" });
  const clinic = strip.getByRole("link", { name: "Clinic visit" });
  const online = strip.getByRole("link", { name: "Consult online" });
  const bg = (l: typeof clinic) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg(clinic)).not.toBe(await bg(online));
});

test("switching language back and forth logs no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    // Known, separate issue: background prefetches of some stub pages return 404 (navigation
    // works). This test is about script and React errors, so network 404s are ignored here.
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "हिन्दी", exact: true }).first().click();
  await expect(page).toHaveURL(/\/hi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.getByRole("link", { name: "EN", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});
