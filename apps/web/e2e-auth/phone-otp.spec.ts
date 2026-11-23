import { expect, test } from "@playwright/test";
import {
  deleteTestUsers,
  openPanel,
  resetLimits,
  signUpWithPhone,
  TEST_PHONES,
  panel,
} from "./helpers";

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("new patient signs up with a phone code (local test number)", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[0], "Meera Test");
});

test("five wrong codes force a new code", async ({ page }) => {
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByLabel("Mobile number").fill(TEST_PHONES[1]);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await dialog.getByLabel("6-digit code").fill(`99999${attempt}`);
    await expect(dialog.getByRole("alert")).toContainText("That code is wrong or has expired");
  }
  await dialog.getByLabel("6-digit code").fill("999995");
  await expect(dialog.getByRole("alert")).toContainText("Too many tries for this code");
});

test("non-Indian numbers are refused before any code is sent", async ({ page }) => {
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByLabel("Mobile number").fill("4155550123");
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter a 10-digit Indian mobile number");
  await expect(dialog.getByLabel("6-digit code")).toHaveCount(0);
});
