import { expect, test } from "@playwright/test";
import {
  deleteTestUsers,
  gotoReady,
  logOut,
  resetLimits,
  signUpWithPhone,
  TEST_CODE,
  TEST_PHONES,
} from "./helpers";
import { restoreRecentAuthMinutes, setRecentAuthMinutes } from "./local-db";

/** Account security (docs/specs/signed-in-home.md item 67). */

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  restoreRecentAuthMinutes();
  await deleteTestUsers();
});

test("recent sign-in expiry: changing the phone asks to confirm it's you, then continues", async ({
  page,
}) => {
  test.slow(); // waits 65 s for the 1-minute window to pass
  setRecentAuthMinutes(1); // before sign-in, so the server proof uses the short window
  try {
    await signUpWithPhone(page, TEST_PHONES[0], "Change Tester");
    await page.waitForTimeout(65_000);
    await resetLimits();
    await gotoReady(page, "/account");
    await page.getByRole("main").getByRole("button", { name: "Change" }).first().click();
    await page.getByLabel("Mobile number").fill(TEST_PHONES[1]);
    await page.getByRole("button", { name: "Send code" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Confirm it's you to change your mobile number",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Send code" }).click();
    await dialog.getByLabel("6-digit code").fill(TEST_CODE);
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel(/Enter the 6-digit code we sent to/)).toBeVisible();
  } finally {
    restoreRecentAuthMinutes();
  }
});

test("sign out everywhere ends the session on another device too", async ({ page, browser }) => {
  test.slow(); // Supabase allows one SMS code per number every ~30 s
  await signUpWithPhone(page, TEST_PHONES[2], "Everywhere Tester");
  await page.waitForTimeout(31_000);
  const other = await browser.newContext();
  const second = await other.newPage();
  await resetLimits();
  await second.goto("/?login=1");
  const dialog = second.locator('[role="dialog"][data-state="open"]');
  await dialog.getByLabel("Mobile number").fill(TEST_PHONES[2]);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByLabel("6-digit code").fill(TEST_CODE);
  await expect(dialog).toBeHidden();
  await second.waitForLoadState("networkidle");
  await gotoReady(second, "/account");
  await expect(
    second.getByRole("main").getByRole("heading", { name: "Account", exact: true }),
  ).toBeVisible();

  await gotoReady(page, "/account");
  await page.getByRole("main").getByRole("button", { name: "Sign out everywhere" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: /Login/ })).toBeVisible();

  await second.goto("/account");
  await expect(second).toHaveURL(/\/login\?next=%2Faccount/);
  await other.close();
});

test("after sign-out, Back shows no private data", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[3], "Back Tester");
  await gotoReady(page, "/account");
  await expect(
    page.getByRole("main").getByText(`+91 •••••• ${TEST_PHONES[3].slice(-4)}`),
  ).toBeVisible();
  await logOut(page, "Back Tester");
  await page.goBack();
  await page.waitForTimeout(1500);
  await expect(page.getByText(`+91 •••••• ${TEST_PHONES[3].slice(-4)}`)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sign-in methods" })).toHaveCount(0);
});

test("idle sign-out warns, then signs out and clears device data", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[4], "Idle Tester");
  await page.evaluate(() =>
    localStorage.setItem("acx:recent-searches", JSON.stringify(["dentist"])),
  );
  await page.clock.install();
  await gotoReady(page, "/account");
  await page.clock.runFor("28:05");
  await expect(page.getByRole("alertdialog", { name: "Are you still there?" })).toBeVisible();
  await page.clock.runFor("02:05");
  await expect(page.getByRole("banner").getByRole("link", { name: /Login/ })).toBeVisible({
    timeout: 15_000,
  });
  expect(await page.evaluate(() => localStorage.getItem("acx:recent-searches"))).toBeNull();
});
