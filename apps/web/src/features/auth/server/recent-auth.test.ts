// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, { value: string; options?: unknown }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)?.value } : undefined),
    set: (name: string, value: string, options?: unknown) => void jar.set(name, { value, options }),
  }),
}));

const {
  RECENT_COOKIE,
  isRecentToken,
  markRecentAuth,
  recentAuthMinutes,
  recentToken,
  requireRecentAuth,
  sessionIdFromToken,
} = await import("./recent-auth");

const env = { RATE_LIMIT_HMAC_SECRET: "test-secret" };
const SESSION = "aaaaaaaa-0000-4000-8000-00000000000a";
const NOW = 1_800_000_000; // seconds

function settingsClient(intValue: number | null | "throw") {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (intValue === "throw") throw new Error("down");
            return { data: intValue === null ? null : { int_value: intValue }, error: null };
          },
        }),
      }),
    }),
  };
}

function claimsClient(sessionId: string | null, error: unknown = null) {
  return {
    auth: {
      getClaims: async () => ({
        data: sessionId ? { claims: { session_id: sessionId } } : null,
        error,
      }),
    },
  };
}

beforeEach(() => {
  jar.clear();
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "test-secret");
});

describe("isRecentToken", () => {
  it("accepts a token for the same session before and at its expiry", () => {
    const token = recentToken(SESSION, NOW + 60, env);
    expect(isRecentToken(token, SESSION, NOW, env)).toBe(true);
    expect(isRecentToken(token, SESSION, NOW + 60, env)).toBe(true);
  });

  it("rejects it one second after expiry", () => {
    expect(isRecentToken(recentToken(SESSION, NOW, env), SESSION, NOW + 1, env)).toBe(false);
  });

  it("rejects a token from another session", () => {
    const token = recentToken(SESSION, NOW + 60, env);
    expect(isRecentToken(token, "bbbbbbbb-0000-4000-8000-00000000000b", NOW, env)).toBe(false);
  });

  it("rejects a forged signature or a longer expiry", () => {
    const token = recentToken(SESSION, NOW + 60, env);
    const [, , signature] = token.split(".");
    expect(isRecentToken(`${SESSION}.${NOW + 9999}.${signature}`, SESSION, NOW, env)).toBe(false);
    expect(
      isRecentToken(
        recentToken(SESSION, NOW + 60, { RATE_LIMIT_HMAC_SECRET: "other" }),
        SESSION,
        NOW,
        env,
      ),
    ).toBe(false);
  });

  it("rejects missing and malformed input", () => {
    expect(isRecentToken(undefined, SESSION, NOW, env)).toBe(false);
    expect(isRecentToken("a.b", SESSION, NOW, env)).toBe(false);
    expect(isRecentToken(recentToken(SESSION, NOW + 60, env), null, NOW, env)).toBe(false);
  });
});

describe("recentAuthMinutes", () => {
  it("reads the app_settings window", async () => {
    expect(await recentAuthMinutes(settingsClient(5) as never)).toBe(5);
  });

  it("falls back to 15 when missing, out of range or failing", async () => {
    expect(await recentAuthMinutes(settingsClient(null) as never)).toBe(15);
    expect(await recentAuthMinutes(settingsClient(0) as never)).toBe(15);
    expect(await recentAuthMinutes(settingsClient("throw") as never)).toBe(15);
  });
});

describe("markRecentAuth and requireRecentAuth", () => {
  it("passes right after a mark for the same session", async () => {
    await markRecentAuth(settingsClient(15) as never, SESSION, NOW * 1000);
    expect(jar.get(RECENT_COOKIE)?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 900,
    });
    expect(await requireRecentAuth(claimsClient(SESSION) as never, (NOW + 60) * 1000)).toEqual({
      ok: true,
    });
  });

  it("requires re-verify once the window has passed", async () => {
    await markRecentAuth(settingsClient(15) as never, SESSION, NOW * 1000);
    expect(await requireRecentAuth(claimsClient(SESSION) as never, (NOW + 901) * 1000)).toEqual({
      ok: false,
      reason: "reauth_required",
    });
  });

  it("requires re-verify without a proof cookie", async () => {
    expect(await requireRecentAuth(claimsClient(SESSION) as never, NOW * 1000)).toEqual({
      ok: false,
      reason: "reauth_required",
    });
  });

  it("requires re-verify for another session or when the claims fail", async () => {
    await markRecentAuth(settingsClient(15) as never, SESSION, NOW * 1000);
    expect(
      (
        await requireRecentAuth(
          claimsClient("bbbbbbbb-0000-4000-8000-00000000000b") as never,
          NOW * 1000,
        )
      ).ok,
    ).toBe(false);
    expect(
      (await requireRecentAuth(claimsClient(SESSION, new Error("bad jwt")) as never, NOW * 1000))
        .ok,
    ).toBe(false);
  });

  it("does nothing without a session id", async () => {
    await markRecentAuth(settingsClient(15) as never, null, NOW * 1000);
    expect(jar.has(RECENT_COOKIE)).toBe(false);
  });
});

describe("sessionIdFromToken", () => {
  it("reads session_id from a token payload", () => {
    const payload = Buffer.from(JSON.stringify({ session_id: SESSION })).toString("base64url");
    expect(sessionIdFromToken(`x.${payload}.y`)).toBe(SESSION);
  });

  it("returns null for bad input", () => {
    expect(sessionIdFromToken("not-a-token")).toBeNull();
    expect(sessionIdFromToken(undefined)).toBeNull();
  });
});
