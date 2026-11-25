import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { deleteTestUsers, gotoReady, resetLimits, signUpWithPhone, TEST_PHONES } from "./helpers";

/**
 * The signed-in home at "/" (docs/specs/signed-in-home.md item 64), against the production build.
 * Runs at 1280 (auth-chromium) and 360 (mobile-360).
 */

test.beforeEach(async () => {
  await deleteTestUsers();
  await resetLimits();
});
test.afterAll(async () => {
  await deleteTestUsers();
});

test("signed out, / is the public home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("doctors-section")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toHaveCount(
    0,
  );
});

test("signed in, / is the signed-in home at the same URL, private and noindex", async ({
  page,
}) => {
  await signUpWithPhone(page, TEST_PHONES[0], "Home Tester");
  const response = await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/");
  const headers = response?.headers() ?? {};
  expect(headers["cache-control"]).toBe("private, no-store, max-age=0");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["content-security-policy"]).toMatch(/'nonce-[^']+' 'strict-dynamic'/);
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: /^Good (morning|afternoon|evening), Home$/ }),
  ).toBeVisible();
});

test("a new account sees greeting, Booking for, Up next 'Book a visit', Near you and Complete your profile only", async ({
  page,
}) => {
  await signUpWithPhone(page, TEST_PHONES[1], "Fresh Patient");
  await gotoReady(page, "/");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: /Fresh$/ })).toBeVisible();
  await expect(main.getByRole("heading", { name: "No upcoming appointments" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Book a visit" })).toBeVisible();
  // Up next is compact: the heading opens My appointments, details expand on demand.
  await expect(
    main.getByRole("heading", { name: "No upcoming appointments" }).getByRole("link"),
  ).toHaveAttribute("href", "/appointments");
  const toggle = main.getByRole("button", { name: "Show more" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(main.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(main.getByRole("link", { name: "My appointments" })).toBeVisible();
  await expect(main.getByRole("button", { name: /^Booking for You \(Fresh\)/ })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Quick actions" })).toHaveCount(0);
  await expect(main.getByRole("heading", { name: "Near you", exact: true })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Complete your profile" })).toBeVisible();
  // Hidden when empty; visitor-only blocks are gone.
  await expect(main.getByRole("heading", { name: "Needs your attention" })).toHaveCount(0);
  await expect(main.getByRole("heading", { name: "Your doctors" })).toHaveCount(0);
  await expect(page.getByTestId("doctors-section")).toHaveCount(0);
  await expect(main.getByRole("region", { name: /carousel/i })).toHaveCount(0);
  // Never a full phone number on the page.
  await expect(page.getByText(`+91${TEST_PHONES[1]}`)).toHaveCount(0);

  if (test.info().project.name === "auth-chromium") {
    mkdirSync("../../docs/designs/signed-in-home", { recursive: true });
    await page.screenshot({
      path: "../../docs/designs/signed-in-home/new-account-1280.png",
      fullPage: true,
    });
  }
});

test("the Complete your profile card can be dismissed and stays dismissed", async ({
  page,
  context,
}) => {
  await signUpWithPhone(page, TEST_PHONES[2], "Dismiss Tester");
  await gotoReady(page, "/");
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(main.getByRole("heading", { name: "Complete your profile" })).toHaveCount(0);
  // The dismissal is a device cookie set by the server action; wait for it before reloading.
  await expect
    .poll(async () =>
      (await context.cookies()).some((cookie) => cookie.name === "acx_dismiss_profile_card"),
    )
    .toBe(true);
  await gotoReady(page, "/");
  await expect(
    main
      .getByRole("heading", { name: "Up next" })
      .or(main.getByRole("heading", { name: "No upcoming appointments" })),
  ).toBeVisible();
  await expect(main.getByRole("heading", { name: "Complete your profile" })).toHaveCount(0);
});

test("layout shift stays below 0.1 while the home loads", async ({ page }) => {
  await signUpWithPhone(page, TEST_PHONES[3], "Shift Tester");
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Near you", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});
