import { expect, test } from "@playwright/test";
import {
  deleteTestUsers,
  emailCode,
  logOut,
  openPanel,
  resetLimits,
  signUpWithEmail,
  uniqueEmail,
  panel,
} from "./helpers";

test.beforeEach(async () => {
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("new patient signs up with an email code and lands signed in", async ({ page }) => {
  await signUpWithEmail(page, uniqueEmail("signup"), "Asha Test");
});

test("a wrong code shows one message and keeps the code step", async ({ page }) => {
  const email = uniqueEmail("wrong");
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByRole("button", { name: "Use email instead" }).click();
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  const real = await emailCode(email);
  await dialog.getByLabel("6-digit code").fill(real === "000000" ? "111111" : "000000");
  await expect(dialog.getByRole("alert")).toContainText("That code is wrong or has expired");
});

test("a returning patient skips Finish sign-up; logout ends the session", async ({ page }) => {
  test.slow(); // waits out Supabase's 30 s resend interval for the same address
  const email = uniqueEmail("returning");
  await signUpWithEmail(page, email, "Ravi Test");
  await logOut(page, "Ravi Test");
  await page.waitForTimeout(31_000);
  await resetLimits();
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByRole("button", { name: "Use email instead" }).click();
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByLabel("6-digit code").fill(await emailCode(email));
  await expect(page.getByRole("button", { name: "Account menu for Ravi Test" })).toBeVisible();
});
