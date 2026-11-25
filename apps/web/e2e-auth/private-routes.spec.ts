import { expect, test } from "@playwright/test";
import {
  admin,
  deleteTestUsers,
  gotoReady,
  logOut,
  resetLimits,
  signUpWithPhone,
  TEST_PHONES,
} from "./helpers";

/** Private routes (docs/specs/signed-in-home.md item 65). */

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

for (const route of ["/appointments", "/profile", "/account", "/support"]) {
  test(`signed out, ${route} goes to sign-in with a safe next`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}$`));
  });
}

test("another person's appointment id shows the same not-found page, with no hint it exists", async ({
  page,
}) => {
  await signUpWithPhone(page, TEST_PHONES[0], "Patient Alpha");
  await gotoReady(page, "/appointments/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f");
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Appointment not found" }),
  ).toBeVisible();
  await expect(page.locator('head meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  await gotoReady(page, "/appointments/not-a-uuid");
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Appointment not found" }),
  ).toBeVisible();
});

test("a forged profile cookie with another account's profile id shows only your own profile", async ({
  page,
  context,
}) => {
  await signUpWithPhone(page, TEST_PHONES[1], "Patient Bravo");
  await logOut(page, "Patient Bravo");
  const { data } = await admin()
    .from("profile_access")
    .select("patient_profile_id, account_id")
    .eq("relationship", "self");
  const bravoProfile = data?.[0]?.patient_profile_id;
  expect(bravoProfile).toBeTruthy();

  await signUpWithPhone(page, TEST_PHONES[2], "Patient Charlie");
  await context.addCookies([
    { name: "acx_profile", value: String(bravoProfile), url: "http://localhost:3200" },
  ]);
  await gotoReady(page, "/profile");
  const main = page.getByRole("main");
  await expect(main.getByText("We switched you back to your own profile.")).toBeVisible();
  await expect(main.getByText("Showing Patient Charlie")).toBeVisible();
  await expect(page.getByText("Patient Bravo")).toHaveCount(0);
});

test("appointments tabs show their empty states", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[3], "Tabs Tester");
  await gotoReady(page, "/appointments?tab=past");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Past" })).toHaveAttribute("aria-current", "page");
  await expect(main.getByText("No past appointments yet.")).toBeVisible();
  await gotoReady(page, "/appointments?tab=nonsense");
  await expect(main.getByRole("link", { name: "Upcoming" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
