import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/** Partner app base URL baked into the e2e build so the footer partner band renders (href checks only). */
export const E2E_PARTNER_URL =
  process.env.NEXT_PUBLIC_PARTNER_URL ?? "https://partners.example.test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against a production build so they reflect real performance and markup.
  // Feature flags are left unset, so every flag is off (the default).
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_PARTNER_URL: E2E_PARTNER_URL },
    timeout: 300_000,
  },
});
