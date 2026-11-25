import { expect, test } from "@playwright/test";

/**
 * Security headers and private-route behaviour without Supabase (docs/specs/signed-in-home.md
 * item 62). Signed-in journeys are in e2e-auth/.
 */

const ID = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

test.describe("security headers", () => {
  test("public / is cacheable, has the public CSP and the hardening headers, and sets no session cookie", async ({
    request,
  }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const h = response.headers();
    expect(h["content-security-policy"]).toContain("script-src 'self' 'unsafe-inline'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-frame-options"]).toBe("DENY");
    // Local runs are plain http: HSTS is only sent when deployed (VERCEL=1; unit-tested).
    expect(h["strict-transport-security"]).toBeUndefined();
    expect(h["cache-control"]).toMatch(/s-maxage=\d+/);
    expect(h["set-cookie"] ?? "").not.toMatch(/sb-|acx_/);
    expect(h["x-robots-tag"]).toBeUndefined();
  });

  test("a private page is no-store, noindex and has a nonce CSP without unsafe-inline scripts", async ({
    request,
  }) => {
    const response = await request.get("/appointments", { maxRedirects: 0 });
    const h = response.headers();
    expect(h["cache-control"]).toBe("private, no-store, max-age=0");
    expect(h["x-robots-tag"]).toBe("noindex, nofollow");
    const scriptSrc =
      (h["content-security-policy"] ?? "")
        .split("; ")
        .find((part) => part.startsWith("script-src")) ?? "";
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  test("every script on a private page carries the response's nonce", async ({ request }) => {
    const response = await request.get("/support");
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(
      response.headers()["content-security-policy"] ?? "",
    )?.[1];
    const html = await response.text();
    const scripts = [...html.matchAll(/<script([^>]*)>/g)].map((match) => match[1] ?? "");
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((attrs) => !attrs.includes(`nonce="${nonce}"`))).toEqual([]);
  });

  test("robots.txt disallows the private paths", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const path of [
      "/appointments",
      "/profile",
      "/account",
      "/support",
      "/hi/profile",
      "/auth/",
    ]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });
});

test.describe("private routes while signed out", () => {
  test("/appointments sends the visitor to sign-in with a safe next", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page).toHaveURL(/\/login\?next=%2Fappointments/);
  });

  test("an appointment link never carries its id into next", async ({ page }) => {
    await page.goto(`/appointments/${ID}`);
    await expect(page).toHaveURL(/\/login\?next=%2Fappointments(?!%2F)/);
    expect(page.url()).not.toContain(ID);
  });

  test("a direct /home request goes back to /", async ({ request }) => {
    const response = await request.get("/home", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe("/");
  });

  test("/ without a session is the public home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("doctors-section")).toBeVisible();
  });
});
