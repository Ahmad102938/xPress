import { expect, test } from "@playwright/test";
import { deleteTestUsers, gotoReady, resetLimits, signUpWithPhone, TEST_PHONES } from "./helpers";

/**
 * The full signed-in home with DEV fixtures (docs/specs/signed-in-home.md item 64), on the
 * `next dev` server (3201, PATIENT_HOME_FIXTURES=1). Fixture names are visibly fake.
 */

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("fixtures show every section in order, with the real slot-hold timer", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[0], "Fixture Viewer");
  await gotoReady(page, "/");
  const main = page.getByRole("main");
  for (const heading of [
    "Up next",
    "Needs your attention",
    "Continue where you left off",
    "Your doctors",
    "Near you",
  ]) {
    await expect(main.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(main.getByRole("link", { name: "Join call" })).toBeVisible();
  await expect(main.getByText(/Slot held for \d+ more minutes/)).toHaveAttribute(
    "aria-live",
    "polite",
  );
  // Speciality only; never a condition, medicine or diagnosis.
  await expect(main.getByText("Dr. Test Sample, General physician")).toBeVisible();
});

test("one failing section shows its own error and the others still render", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[1], "Failure Viewer");
  await gotoReady(page, "/?__fixture_fail=your_doctors");
  const failed = page.locator('[data-section="your_doctors"]');
  await expect(failed.getByRole("alert")).toContainText("This section could not load.");
  await expect(failed.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { name: "Up next" })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Near you", exact: true }),
  ).toBeVisible();
});
