import { expect, type Page } from "@playwright/test";
import { createAdminClient } from "@acurexpress/db/admin";
import { purgeTestUsers } from "./local-db";

/**
 * Helpers for the auth e2e suite (LOCAL stack only): Mailpit code reader, service-role checks,
 * limiter reset and user cleanup. Synthetic users only (example.test, fake +91 900 numbers).
 */

export const TEST_PHONES = [
  "9000000001",
  "9000000002",
  "9000000003",
  "9000000004",
  "9000000005",
] as const;
export const TEST_CODE = "123456";

export function admin() {
  return createAdminClient();
}

export function uniqueEmail(tag: string) {
  return `e2e.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Clears the app limiter so serial tests from one "local" IP never hit each other's limits. */
export async function resetLimits() {
  const { error } = await admin().from("rate_limits").delete().not("key_hash", "is", null);
  if (error) throw new Error("rate_limits reset failed");
}

/**
 * Deletes users created by this suite (example.test emails and the test phone numbers) with their
 * patient-profile rows, through the local database container (local-db.ts). Fails loudly: a user
 * left behind would break the next run.
 */
export async function deleteTestUsers() {
  purgeTestUsers();
}

/** The 6-digit code mailed to `email` (local Mailpit); each message is read once, then deleted. */
export async function emailCode(email: string): Promise<string> {
  const base = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const search = await fetch(
      `${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const list = (await search.json()) as { messages?: Array<{ ID: string }> };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${base}/api/v1/message/${id}`)).json()) as {
        Text?: string;
      };
      const code = message.Text?.match(/\b(\d{6})\b/)?.[1];
      if (code) {
        // Delete it so the next read for this address only sees a newer code.
        await fetch(`${base}/api/v1/messages`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ IDs: [id] }),
        });
        return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("No code arrived in Mailpit");
}

export async function userIdByEmail(email: string): Promise<string> {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error("user not found");
  return user.id;
}

/** The open sign-in sheet (the hidden location popover also has role="dialog"). */
export function panel(page: Page) {
  return page.locator('[role="dialog"][data-state="open"]');
}

/** The header marks its Login link once the session state has loaded (the interceptor is live). */
export async function waitForAuthReady(page: Page) {
  await page.locator("header [data-auth-ready]").first().waitFor();
}

/** Opens the sign-in drawer from the header on Home. */
export async function openPanel(page: Page, path = "/") {
  await page.goto(path);
  await waitForAuthReady(page);
  await page.getByRole("banner").getByRole("link", { name: /Login/ }).click();
  await expect(panel(page)).toBeVisible();
}

/** True at the md breakpoint and up, where the header shows the avatar menu. */
export function isDesktop(page: Page) {
  return (page.viewportSize()?.width ?? 1280) >= 768;
}

/**
 * Navigates and waits until the page is idle, so React has hydrated before the test clicks.
 * Private pages render per request and stream, so a click right after `goto` can land on server
 * HTML that has no handler yet.
 */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** After a sign-in completes: the panel closes and the client navigation settles. */
async function settledSignedIn(page: Page, name: string) {
  await expect(panel(page)).toBeHidden();
  await page.waitForLoadState("networkidle");
  if (isDesktop(page))
    await expect(page.getByRole("button", { name: menuName(name) })).toBeVisible();
}

/** The header menu is labelled with the first name only (signed-in-home item 56). */
export function menuName(name: string) {
  return `Account menu for ${name.trim().split(/\s+/)[0]}`;
}

export async function signUpWithEmail(page: Page, email: string, name = "Test Patient") {
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByRole("button", { name: "Use email instead" }).click();
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByLabel("6-digit code").fill(await emailCode(email));
  await expect(dialog.getByRole("heading", { name: "Finish sign-up" })).toBeVisible();
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await dialog.getByRole("button", { name: "Finish sign-up" }).click();
  await settledSignedIn(page, name);
}

export async function signUpWithPhone(page: Page, phone: string, name = "Phone Patient") {
  await openPanel(page);
  const dialog = panel(page);
  await dialog.getByLabel("Mobile number").fill(phone);
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByLabel("6-digit code").fill(TEST_CODE);
  await expect(dialog.getByRole("heading", { name: "Finish sign-up" })).toBeVisible();
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await dialog.getByRole("button", { name: "Finish sign-up" }).click();
  await settledSignedIn(page, name);
}

/** Signs out from the avatar menu: the session ends, device state clears, a fresh "/" loads. */
export async function logOut(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: menuName(name) }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: /Login/ })).toBeVisible();
}
