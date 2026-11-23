import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { panel } from "./helpers";

const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "1280", width: 1280, height: 900 },
] as const;
const locales = [
  { name: "en", path: "/", login: /Login/ },
  { name: "hi", path: "/hi", login: /लॉग इन/ },
] as const;

for (const viewport of viewports) {
  for (const locale of locales) {
    test(`open sign-in panel has no critical or serious axe violations (${locale.name}, ${viewport.name}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(locale.path);
      await page.locator("header [data-auth-ready]").first().waitFor();
      await page.getByRole("banner").getByRole("link", { name: locale.login }).click();
      const dialog = panel(page);
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(viewport.width);
      const results = await new AxeBuilder({ page })
        .include('[role="dialog"][data-state="open"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  }
}
