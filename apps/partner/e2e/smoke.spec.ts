import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
}

for (const width of [360, 1280]) {
  test(`partner landing loads at ${width}px, is indexable and passes axe`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Join A-CureXpress as a doctor, clinic or medical shop",
      }),
    ).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(3);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await expectNoSeriousAxeViolations(page);
  });
}

test("partner login placeholder is not indexed", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Partner login" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expectNoSeriousAxeViolations(page);
});
