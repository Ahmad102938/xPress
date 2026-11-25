import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Auth e2e suite against the LOCAL Supabase stack (docs/specs/auth.md R1-B2, R2-B2).
 * Run `scripts/auth-e2e-env.sh` first. Separate from playwright.config.ts: own folder (e2e-auth),
 * own port (3200), own build folder (.next-auth), serial.
 */
const ENV_FILE = ".env.test.local";
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const PORT = 3200;
const FIXTURE_PORT = 3201;
const baseURL = `http://localhost:${PORT}`;
const fixtureURL = `http://localhost:${FIXTURE_PORT}`;
const pass = (names: string[]) =>
  Object.fromEntries(
    names.flatMap((name) => (process.env[name] ? [[name, process.env[name] as string]] : [])),
  );
const shared = pass([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_METHODS",
  "RATE_LIMIT_HMAC_SECRET",
  "CRON_SECRET",
]);

/**
 * Two servers (docs/specs/signed-in-home.md item 69):
 *   3200  production build, every spec except *.fixtures.spec.ts
 *   3201  `next dev` with PATIENT_HOME_FIXTURES=1 (fixtures are impossible in a production build),
 *         only *.fixtures.spec.ts (the full home, section isolation, design screenshots)
 * Projects: desktop 1280 runs everything for its server; mobile-360 runs a11y, the signed-in home
 * and the screenshots.
 */
export default defineConfig({
  testDir: "./e2e-auth",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "auth-chromium",
      testIgnore: /\.fixtures\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile-360",
      testMatch: /(a11y|signed-in-home)\.spec\.ts$/,
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } },
    },
    {
      name: "fixtures",
      testMatch: /\.fixtures\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: fixtureURL,
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 300_000,
      env: { ...shared, NEXT_PUBLIC_SITE_URL: baseURL, NEXT_DIST_DIR: ".next-auth" },
    },
    {
      command: `pnpm next dev --port ${FIXTURE_PORT}`,
      url: fixtureURL,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        ...shared,
        NEXT_PUBLIC_SITE_URL: fixtureURL,
        NEXT_DIST_DIR: ".next-dev-fixtures",
        PATIENT_HOME_FIXTURES: "1",
      },
    },
  ],
});
