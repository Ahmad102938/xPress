import { expect, test } from "@playwright/test";
import { deleteTestUsers, openPanel, resetLimits, TEST_CODE, TEST_PHONES, panel } from "./helpers";

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("closing Finish sign-up keeps the user signed in but blocked (CUJ 5)", async ({ page }) => {
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByLabel("Mobile number").fill(TEST_PHONES[2]);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByLabel("6-digit code").fill(TEST_CODE);
  await expect(dialog.getByRole("heading", { name: "Finish sign-up" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  await page.goto("/doctors");
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Finish sign-up" }),
  ).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount&step=finish/);
  await expect(page.getByRole("heading", { name: "Finish sign-up" })).toBeVisible();
});
