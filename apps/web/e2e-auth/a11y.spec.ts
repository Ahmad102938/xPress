import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  deleteTestUsers,
  gotoReady,
  menuName,
  panel,
  resetLimits,
  signUpWithPhone,
  TEST_PHONES,
} from "./helpers";

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

// ---- Signed-in pages (docs/specs/signed-in-home.md item 68) -----------------------------------

test.describe("signed-in pages", () => {
  test.beforeEach(async () => {
    await deleteTestUsers();
    await resetLimits();
  });
  test.afterAll(async () => {
    await deleteTestUsers();
  });

  test("home, profile, account, appointments and support have no critical or serious axe violations", async ({
    page,
  }) => {
    await signUpWithPhone(page, TEST_PHONES[0], "Axe Tester");
    for (const route of ["/", "/profile", "/account", "/appointments", "/support"]) {
      await gotoReady(page, route);
      await page.locator("main h1, main h2").first().waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        serious.map(
          (v) => `${route} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    }
  });

  test("keyboard only: header, avatar menu and bottom tabs", async ({ page }) => {
    await signUpWithPhone(page, TEST_PHONES[1], "Keys Tester");
    await gotoReady(page, "/");
    const width = page.viewportSize()?.width ?? 1280;
    if (width >= 768) {
      const menu = page.getByRole("button", { name: menuName("Keys Tester") });
      for (
        let i = 0;
        i < 40 && !(await menu.evaluate((el) => el === document.activeElement));
        i += 1
      ) {
        await page.keyboard.press("Tab");
      }
      await expect(menu).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("menu")).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitem").first()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toBeHidden();
      await expect(menu).toBeFocused();
    } else {
      const tabs = page.getByRole("navigation", { name: "Quick navigation" });
      const appointments = tabs.getByRole("link", { name: "Appointments" });
      for (
        let i = 0;
        i < 80 && !(await appointments.evaluate((el) => el === document.activeElement));
        i += 1
      ) {
        await page.keyboard.press("Tab");
      }
      await expect(appointments).toBeFocused();
      const box = await appointments.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/appointments$/);
    }
  });
});
