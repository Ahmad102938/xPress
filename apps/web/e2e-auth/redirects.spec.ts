import { expect, test } from "@playwright/test";
import { deleteTestUsers, emailCode, resetLimits, uniqueEmail, panel } from "./helpers";

test.beforeEach(async () => {
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("a protected page redirects to /login and returns after sign-in", async ({ page }) => {
  await page.goto("/appointments");
  await expect(page).toHaveURL(/\/login\?next=%2Fappointments$/);
  const email = uniqueEmail("redirect");
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("6-digit code").fill(await emailCode(email));
  await page.getByLabel("Full name").fill("Return Test");
  await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page).toHaveURL(/\/appointments$/);
  await expect(page.getByRole("heading", { name: "My appointments" })).toBeVisible();
});

test("Hindi protected pages return to the Hindi page", async ({ page }) => {
  await page.goto("/hi/account");
  await expect(page).toHaveURL(/\/hi\/login\?next=%2Fhi%2Faccount$/);
});

test("?login=1&next=//evil.com opens the panel and stays on this site", async ({ page }) => {
  await page.goto("/?login=1&next=%2F%2Fevil.com");
  await expect(panel(page)).toBeVisible();
  expect(new URL(page.url()).host).toBe("localhost:3200");
});

test("Home is still statically prerendered with sign-in present", async ({ request }) => {
  const response = await request.get("/");
  expect(
    response.headers()["x-nextjs-prerender"] ?? response.headers()["x-nextjs-cache"] ?? "",
  ).not.toBe("");
});
