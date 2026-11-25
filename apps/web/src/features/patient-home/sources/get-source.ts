import type { HomeSource } from "../contract";
import { realSource } from "./real";

/**
 * Picks the home data source (docs/specs/signed-in-home.md item 50). The fixture source can only
 * be chosen when NODE_ENV is not "production" AND PATIENT_HOME_FIXTURES=1. NODE_ENV is inlined at
 * build time, so in a production build the whole branch, and the fixture module with it, is
 * removed. Three locks: this check, env-check.ts (Vercel production build fails with the flag),
 * and scripts/check-no-fixtures.mjs (post-build scan for the fixture marker).
 */
export function fixturesAllowed(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV !== "production" && env.PATIENT_HOME_FIXTURES === "1";
}

export async function getHomeSource(): Promise<HomeSource> {
  if (process.env.NODE_ENV !== "production" && fixturesAllowed(process.env)) {
    const { devFixtureSource } = await import("./dev-fixtures");
    return devFixtureSource;
  }
  return realSource;
}
