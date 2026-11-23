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
const baseURL = `http://localhost:${PORT}`;
const pass = (names: string[]) =>
  Object.fromEntries(
    names.flatMap((name) => (process.env[name] ? [[name, process.env[name] as string]] : [])),
  );

export default defineConfig({
  testDir: "./e2e-auth",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "auth-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...pass([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_SITE_URL",
        "AUTH_METHODS",
        "RATE_LIMIT_HMAC_SECRET",
        "CRON_SECRET",
      ]),
      NEXT_DIST_DIR: ".next-auth",
    },
  },
});
