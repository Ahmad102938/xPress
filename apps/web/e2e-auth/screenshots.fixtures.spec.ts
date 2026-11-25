import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { deleteTestUsers, gotoReady, resetLimits, signUpWithPhone, TEST_PHONES } from "./helpers";

/** Design screenshots for review (docs/specs/signed-in-home.md item 70), from DEV fixtures. */
const DIR = "../../docs/designs/signed-in-home";

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("populated, loading, section error and mobile screenshots", async ({ page }) => {
  test.slow();
  await signUpWithPhone(page, TEST_PHONES[2], "Screenshot Viewer");
  const mobile = test.info().project.name === "mobile-360";

  await gotoReady(page, "/");
  await expect(page.getByRole("main").getByRole("heading", { name: "Your doctors" })).toBeVisible();
  await page.waitForTimeout(500);
  if (mobile) {
    await page.screenshot({ path: `${DIR}/mobile-360.png`, fullPage: true });
    return;
  }
  await page.screenshot({ path: `${DIR}/populated-1280.png`, fullPage: true });

  await page.goto("/?__fixture_delay=8000", { waitUntil: "commit" });
  await page.locator('[data-section="up_next"] [aria-hidden="true"]').first().waitFor();
  await page.screenshot({ path: `${DIR}/loading-1280.png` });

  await gotoReady(page, "/?__fixture_fail=your_doctors");
  await expect(page.locator('[data-section="your_doctors"]').getByRole("alert")).toBeVisible();
  await page.screenshot({ path: `${DIR}/section-error-1280.png`, fullPage: true });

  await page.setViewportSize({ width: 360, height: 800 });
  await gotoReady(page, "/");
  await expect(page.getByRole("main").getByRole("heading", { name: "Up next" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/mobile-360.png`, fullPage: true });
});
