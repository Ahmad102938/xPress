import { rateLimitHit, rateLimitReset } from "@acurexpress/db/admin";
import { allow, type Limiter, type LimitName } from "./rate-limit";

/**
 * The shared rate limiter (docs/specs/signed-in-home.md item 45). A plain server module, not a
 * "use server" file, so it can never be called as an endpoint. It uses the server-only admin client
 * to call rate_limit_hit with HMAC keys: the one documented service-role use near the patient area
 * (docs/AUTH.md). It touches no patient rows.
 */
export const limiter: Limiter = { hit: rateLimitHit, reset: rateLimitReset };

/** Counts the given limits; a limiter failure fails closed as "error". */
export async function within(
  checks: ReadonlyArray<{ limit: LimitName; key: string }>,
): Promise<boolean | "error"> {
  try {
    return await allow(limiter, checks);
  } catch {
    return "error";
  }
}
