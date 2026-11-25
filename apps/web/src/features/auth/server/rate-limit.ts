import { createHmac } from "node:crypto";

/**
 * App-side abuse limits (docs/specs/auth.md Part B "Abuse controls", R1-M8, R2-M4, R2-M11).
 * Keys are HMAC-SHA256 hex of "<kind>:<value>", so the database never sees a phone, email or IP.
 */

export const LIMITS = {
  sendPerIp: { windowSeconds: 3600, max: 10 },
  sendPerDestination: { windowSeconds: 3600, max: 5 },
  resendCooldown: { windowSeconds: 30, max: 1 },
  verifyPerDestination: { windowSeconds: 600, max: 5 },
  profileAddPerUser: { windowSeconds: 86_400, max: 5 },
  profileAddPerIp: { windowSeconds: 86_400, max: 20 },
  // docs/specs/signed-in-home.md item 37: each has its own key kind, so no counter is shared.
  reverifyPerUser: { windowSeconds: 3600, max: 5 },
  cspReportPerIp: { windowSeconds: 3600, max: 60 },
  profileWritePerUser: { windowSeconds: 3600, max: 60 },
} as const;

export type LimitName = keyof typeof LIMITS;
export type KeyKind =
  | "ip"
  | "dest"
  | "resend"
  | "verify"
  | "user"
  | "profile-ip"
  | "reverify-user"
  | "csp-ip"
  | "profile-write-user";

type Env = Record<string, string | undefined>;

export function hmacSecret(env: Env = process.env): string {
  const secret = env.RATE_LIMIT_HMAC_SECRET;
  if (secret) return secret;
  if (env.VERCEL === "1") throw new Error("RATE_LIMIT_HMAC_SECRET is missing.");
  return "local-development-only-not-a-secret";
}

export function limiterKey(kind: KeyKind, value: string, env: Env = process.env): string {
  return createHmac("sha256", hmacSecret(env)).update(`${kind}:${value}`).digest("hex");
}

/**
 * Client IP for rate limiting. Deployed: the first x-forwarded-for value (set by Vercel), or the
 * shared "unknown" bucket when missing (fail closed). Locally and in CI: "local".
 */
export function clientIp(headers: Pick<Headers, "get">, env: Env = process.env): string {
  if (env.VERCEL !== "1") return "local";
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}

export interface Limiter {
  hit(keyHash: string, windowSeconds: number, max: number): Promise<boolean>;
  reset(keyHash: string): Promise<void>;
}

/** True when every named limit still allows this request (each one is counted). */
export async function allow(
  limiter: Limiter,
  checks: ReadonlyArray<{ limit: LimitName; key: string }>,
): Promise<boolean> {
  let allowed = true;
  for (const { limit, key } of checks) {
    const { windowSeconds, max } = LIMITS[limit];
    if (!(await limiter.hit(key, windowSeconds, max))) allowed = false;
  }
  return allowed;
}
