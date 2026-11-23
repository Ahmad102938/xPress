import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests for the signed-out Home page. The server runs with no FLAG_* env vars, so the four
 * product flags are off (default) and the shop network is on (default).
 */

const viewports = [
  { name: "mobile 360", width: 360, height: 800 },
  { name: "desktop 1280", width: 1280, height: 900 },
] as const;

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    serious.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

for (const viewport of viewports) {
  test.describe(`Home at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("renders the key sections", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/A-CureXpress/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Search" })).toBeVisible();
      await expect(page.getByTestId("quick-actions")).toBeVisible();
      await expect(page.getByRole("region", { name: "Highlights" })).toBeVisible();
      for (const heading of [
        "Browse by speciality",
        "Verified doctors near you",
        "Clinics on A-CureXpress",
        "Medical shops near you",
        "How it works",
        "Why you can trust us",
        "Talk to a doctor online",
        "Patient stories",
        "Frequently asked questions",
      ]) {
        await expect(
          page.getByRole("heading", { name: heading, level: 2, exact: true }),
        ).toBeVisible();
      }
      await expect(page.getByRole("note")).toContainText("In an emergency call 112");
      await expect(page.getByRole("contentinfo")).toContainText(
        "A-CureXpress does not provide emergency care. In an emergency call 112.",
      );
      // Sample data is labelled on screen.
      await expect(page.getByText(/Sample listings for preview/).first()).toBeVisible();
    });

    test("flags off: no medicine or AI UI", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("quick-action-medicines")).toHaveCount(0);
      await expect(page.getByTestId("quick-action-healthAssistant")).toHaveCount(0);
      await expect(page.getByTestId("ai-promo")).toHaveCount(0);
      await expect(page.getByTestId("prescription-note")).toHaveCount(0);
      await expect(page.getByText("AI Health Consultant")).toHaveCount(0);

      const search = page.getByRole("combobox", { name: "Search" });
      await expect(search).toHaveAttribute("placeholder", "Search doctors, clinics, specialities");
      await search.fill("e");
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByRole("group", { name: "Medicines" })).toHaveCount(0);
      await expect(page.getByRole("group", { name: "Doctors" })).toBeVisible();
    });

    test("has no horizontal page scroll", async ({ page }) => {
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("bottom nav only on small screens", async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Quick navigation" });
      if (viewport.width < 768) await expect(nav).toBeVisible();
      else await expect(nav).toBeHidden();
    });

    test("axe: no critical or serious violations", async ({ page }) => {
      await page.goto("/");
      await expectNoSeriousAxeViolations(page);
    });
  });
}

test("carousel: buttons and arrow keys change the slide", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Highlights" });
  const dot = (n: number) => carousel.getByRole("button", { name: `Go to slide ${n}` });
  await expect(dot(1)).toHaveAttribute("aria-current", "true");
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(dot(2)).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("ArrowRight");
  await expect(dot(3)).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("ArrowRight");
  await expect(dot(1)).toHaveAttribute("aria-current", "true");
});

test("Book while signed out leads to login with a return path", async ({ page }) => {
  await page.goto("/");
  const book = page.getByRole("link", { name: "Book an appointment with Dr. Asha Example" });
  await expect(book).toHaveAttribute("href", /\/login\?next=%2Fdoctors%2Fsample-doc-1/);
});

test("Hindi home renders with lang=hi and passes axe", async ({ page }) => {
  await page.goto("/hi");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { name: "स्पेशलिटी के अनुसार देखें" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("CTA targets exist; flag-off pages are 404", async ({ request }) => {
  for (const path of [
    "/doctors",
    "/consult",
    "/shops",
    "/login",
    "/trust",
    "/about",
    "/terms",
    "/privacy",
    "/hi/doctors",
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  for (const path of ["/medicines", "/health-assistant"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test.describe("locale redirects (unchanged by the auth proxy)", () => {
  test("/en paths redirect to the unprefixed English URL", async ({ page }) => {
    const response = await page.goto("/en/doctors");
    expect(new URL(page.url()).pathname).toBe("/doctors");
    expect(response?.ok()).toBe(true);
  });

  test("a Hindi browser on / is sent to /hi", async ({ browser }) => {
    const context = await browser.newContext({
      locale: "hi-IN",
      extraHTTPHeaders: { "accept-language": "hi-IN,hi;q=0.9" },
    });
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/hi");
    await context.close();
  });
});
