import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDeployed } from "@acurexpress/db";
import type { ServerClient } from "./profile-guard";
import { hmacSecret } from "./rate-limit";

/**
 * Recent sign-in check (docs/specs/signed-in-home.md Part C, Step 0 "server proof" result).
 *
 * Step 0 showed that verifying a phone_change code writes a fresh `amr` timestamp, so the JWT cannot
 * prove a recent sign-in: a stolen session could change the phone and look "recent". Instead the
 * server issues its own proof right after a real sign-in or re-verify: an httpOnly cookie
 *   acx_recent = <session_id>.<expiry epoch seconds>.<hmac>
 * keyed with RATE_LIMIT_HMAC_SECRET and the domain prefix "recent:". It is only valid for the same
 * session and until the expiry (now + app_settings.recent_auth_minutes, default 15, TODO_HCQ).
 * Contact changes never set it.
 */

export const RECENT_COOKIE = "acx_recent";
export const RECENT_AUTH_DEFAULT_MINUTES = 15;

type Env = Record<string, string | undefined>;

function sign(sessionId: string, expiresAt: number, env: Env): string {
  return createHmac("sha256", hmacSecret(env))
    .update(`recent:${sessionId}.${expiresAt}`)
    .digest("hex");
}

export function recentToken(sessionId: string, expiresAt: number, env: Env = process.env): string {
  return `${sessionId}.${expiresAt}.${sign(sessionId, expiresAt, env)}`;
}

/** True when the token belongs to this session, is not expired (inclusive) and is signed by us. */
export function isRecentToken(
  token: string | undefined,
  sessionId: string | null,
  nowSeconds: number,
  env: Env = process.env,
): boolean {
  if (!token || !sessionId) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenSession, expiry, signature] = parts as [string, string, string];
  if (tokenSession !== sessionId || !/^\d{1,12}$/.test(expiry)) return false;
  const expiresAt = Number(expiry);
  if (expiresAt < nowSeconds) return false;
  const expected = Buffer.from(sign(sessionId, expiresAt, env), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Reads session_id from an access token just returned by Supabase Auth (not used for identity). */
export function sessionIdFromToken(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(accessToken.split(".")[1] ?? "", "base64url").toString(),
    );
    const id = (payload as { session_id?: unknown }).session_id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

/** The window in minutes, from the public app_settings row (default 15). */
export async function recentAuthMinutes(client: ServerClient): Promise<number> {
  try {
    const { data } = await client
      .from("app_settings")
      .select("int_value")
      .eq("key", "recent_auth_minutes")
      .maybeSingle();
    const value = data?.int_value;
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1440
      ? value
      : RECENT_AUTH_DEFAULT_MINUTES;
  } catch {
    return RECENT_AUTH_DEFAULT_MINUTES;
  }
}

export function recentCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isDeployed(),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Sets the proof for this session. Call only after a real sign-in or re-verify succeeded. */
export async function markRecentAuth(
  client: ServerClient,
  sessionId: string | null,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!sessionId) return;
  const minutes = await recentAuthMinutes(client);
  const expiresAt = Math.floor(nowMs / 1000) + minutes * 60;
  (await cookies()).set(
    RECENT_COOKIE,
    recentToken(sessionId, expiresAt),
    recentCookieOptions(minutes * 60),
  );
}

export type RecentAuthResult = { ok: true } | { ok: false; reason: "reauth_required" };

/**
 * The guard for change phone, change email, connect Google, sign out everywhere and the deletion
 * request. The session id comes from verified claims (getClaims), never from an unverified decode.
 * Any failure means "not recent" (fail closed).
 */
export async function requireRecentAuth(
  client: ServerClient,
  nowMs: number = Date.now(),
): Promise<RecentAuthResult> {
  try {
    const { data, error } = await client.auth.getClaims();
    const sessionId =
      !error && typeof data?.claims?.session_id === "string" ? data.claims.session_id : null;
    const token = (await cookies()).get(RECENT_COOKIE)?.value;
    return isRecentToken(token, sessionId, Math.floor(nowMs / 1000))
      ? { ok: true }
      : { ok: false, reason: "reauth_required" };
  } catch {
    return { ok: false, reason: "reauth_required" };
  }
}
