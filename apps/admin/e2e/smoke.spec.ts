import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [360, 1280]) {
  test(`admin login loads at ${width}px, is never indexed and passes axe`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/");
    expect(page.url()).toMatch(/\/login$/);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    await expect(page.getByRole("heading", { level: 1, name: "Admin login" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow, nocache",
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
}

test("robots.txt disallows everything", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /");
});
