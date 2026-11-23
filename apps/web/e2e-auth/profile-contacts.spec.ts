import { expect, test, type Page } from "@playwright/test";
import {
  deleteTestUsers,
  emailCode,
  logOut,
  resetLimits,
  signUpWithEmail,
  signUpWithPhone,
  TEST_CODE,
  TEST_PHONES,
  uniqueEmail,
} from "./helpers";

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

async function addPhone(page: Page, phone: string) {
  await page.goto("/account");
  await page.getByRole("button", { name: "Add mobile number" }).click();
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByRole("button", { name: "Send code" }).click();
}

test("T3: an email account adds a free phone after the code", async ({ page }) => {
  await signUpWithEmail(page, uniqueEmail("t3"), "Tara Test");
  await addPhone(page, TEST_PHONES[1]);
  await page.getByLabel(/Enter the 6-digit code/).fill(TEST_CODE);
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("status")).toContainText("Mobile number added.");
  await expect(page.getByText(`+91${TEST_PHONES[1]}`)).toBeVisible();
});

test("T4: a taken phone shows 'already in use' and changes nothing", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[2], "Owner Test");
  await logOut(page, "Owner Test");
  await signUpWithEmail(page, uniqueEmail("t4"), "Other Test");
  await addPhone(page, TEST_PHONES[2]);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "This number is already in use.",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Add mobile number" })).toBeVisible();
});

test("T5: a phone account adds a free email after verification", async ({ page }) => {
  const email = uniqueEmail("t5");
  await signUpWithPhone(page, TEST_PHONES[3], "Phone Five");
  await page.goto("/account");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel(/Enter the 6-digit code/).fill(await emailCode(email));
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email added. You can now also use it to log in.",
  );
});

test("T6: a phone account adding a taken email gets 'already in use', no merge", async ({
  page,
}) => {
  const taken = uniqueEmail("t6");
  await signUpWithEmail(page, taken, "Email Owner");
  await logOut(page, "Email Owner");
  await signUpWithPhone(page, TEST_PHONES[4], "Phone Six");
  await page.goto("/account");
  await page.getByRole("button", { name: "Add email" }).click();
  await page.getByLabel("Email").fill(taken);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "This email is already in use.",
  );
});

test("T8: a raced phone change never attaches the number to the wrong user (CUJ 9)", async ({
  page,
  browser,
}) => {
  await signUpWithEmail(page, uniqueEmail("t8"), "Racer A");
  await addPhone(page, TEST_PHONES[0]);
  await expect(page.getByLabel(/Enter the 6-digit code/)).toBeVisible();

  // User B takes the number first by signing up with it.
  const other = await browser.newContext();
  const pageB = await other.newPage();
  await resetLimits();
  await signUpWithPhone(pageB, TEST_PHONES[0], "Racer B");
  await other.close();

  await page.getByLabel(/Enter the 6-digit code/).fill(TEST_CODE);
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Add mobile number" })).toBeVisible();
});
