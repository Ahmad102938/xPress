import { expect, test, type Page } from "@playwright/test";
import { deleteTestUsers, gotoReady, resetLimits, signUpWithPhone, TEST_PHONES } from "./helpers";

/** Family profiles (docs/specs/signed-in-home.md item 66). Desktop: the switcher is in the header. */

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

async function addFamilyMember(
  page: Page,
  name: string,
  dob: string,
  relationship: string,
  permission = false,
) {
  await gotoReady(page, "/account");
  await page.getByRole("button", { name: "Add a family member" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a family member" });
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByLabel("Date of birth").fill(dob);
  await dialog.getByLabel("Relationship to you").selectOption({ label: relationship });
  if (permission)
    await dialog.getByLabel("I have their permission to manage their details").check();
  await dialog.getByRole("button", { name: "Save" }).click();
  return dialog;
}

async function switchTo(page: Page, firstName: string) {
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Switch profile/ }).click();
  await page.getByRole("menuitemradio", { name: new RegExp(`^${firstName}`) }).click();
  // The switcher shows the chosen profile once the cookie is set and the page refreshed.
  await expect(
    page.getByRole("button", { name: new RegExp(`Showing ${firstName}`) }),
  ).toBeVisible();
}

test("adding a child shows the switcher; switching changes /profile; addresses belong to one profile", async ({
  page,
}) => {
  await signUpWithPhone(page, TEST_PHONES[0], "Family Owner");
  await expect(page.getByRole("button", { name: /Switch profile/ })).toHaveCount(0);

  const dialog = await addFamilyMember(page, "Kiddo Example", "2019-05-01", "Child");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main").getByText("Kiddo Example")).toBeVisible();
  await gotoReady(page, "/account");
  await expect(page.getByRole("button", { name: /Switch profile/ })).toBeVisible();

  await switchTo(page, "Kiddo");
  await gotoReady(page, "/profile");
  await expect(page.getByRole("main").getByText("Showing Kiddo Example")).toBeVisible();
  await page.getByRole("button", { name: "Add an address" }).click();
  await page.getByLabel("Label").fill("Home");
  await page.getByLabel("House and street").fill("12 Test Street");
  await page.getByLabel("City").fill("Bhopal");
  await page.getByLabel("State").fill("Madhya Pradesh");
  await page.getByLabel("PIN code").fill("462001");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByRole("main").getByText(/12 Test Street/)).toBeVisible();

  await switchTo(page, "Family");
  await gotoReady(page, "/profile");
  await expect(page.getByRole("main").getByText("Showing Family Owner")).toBeVisible();
  await expect(page.getByRole("main").getByText("No saved addresses yet.")).toBeVisible();
});

test("adding an adult needs the permission box", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[1], "Adult Owner");
  const dialog = await addFamilyMember(page, "Elder Example", "1950-01-01", "Parent");
  await expect(dialog.getByRole("alert")).toContainText(
    "Tick the box to confirm you have their permission.",
  );
  await dialog.getByLabel("I have their permission to manage their details").check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main").getByText("Elder Example")).toBeVisible();
});

test("archiving hides a profile from the switcher and restore brings it back", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[2], "Archive Owner");
  await expect(await addFamilyMember(page, "Kiddo Example", "2019-05-01", "Child")).toBeHidden();
  await expect(await addFamilyMember(page, "Teen Example", "2012-05-01", "Child")).toBeHidden();
  await gotoReady(page, "/account");
  const item = page.getByRole("main").getByRole("listitem").filter({ hasText: "Teen Example" });
  await item.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
  await expect(item.getByText("Archived")).toBeVisible();
  await gotoReady(page, "/account");
  await page.getByRole("button", { name: /Switch profile/ }).click();
  await expect(page.getByRole("menuitemradio", { name: /^Teen/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const restored = page.getByRole("main").getByRole("listitem").filter({ hasText: "Teen Example" });
  await restored.getByRole("button", { name: "Restore" }).click();
  await expect(restored.getByText("Archived")).toHaveCount(0);
});
