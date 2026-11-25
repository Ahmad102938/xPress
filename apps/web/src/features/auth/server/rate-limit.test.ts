// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { allow, clientIp, LIMITS, limiterKey, type Limiter } from "./rate-limit";

const env = { RATE_LIMIT_HMAC_SECRET: "test-secret" };

describe("limiterKey", () => {
  it("is a 64-character hex HMAC that never contains the input", () => {
    const key = limiterKey("dest", "+919000000001", env);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("9000000001");
  });

  it("separates kinds and depends on the secret", () => {
    expect(limiterKey("dest", "x", env)).not.toBe(limiterKey("verify", "x", env));
    expect(limiterKey("dest", "x", env)).not.toBe(
      limiterKey("dest", "x", { RATE_LIMIT_HMAC_SECRET: "other" }),
    );
  });

  it("requires the secret on Vercel", () => {
    expect(() => limiterKey("ip", "1.2.3.4", { VERCEL: "1" })).toThrow(/RATE_LIMIT_HMAC_SECRET/);
  });
});

describe("clientIp", () => {
  const headers = (value?: string) => new Headers(value ? { "x-forwarded-for": value } : {});

  it("is 'local' when not deployed, whatever the headers say", () => {
    expect(clientIp(headers("1.2.3.4"), {})).toBe("local");
  });

  it("takes the first forwarded address on Vercel", () => {
    expect(clientIp(headers("203.0.113.7, 10.0.0.1"), { VERCEL: "1" })).toBe("203.0.113.7");
  });

  it("falls back to a shared 'unknown' bucket on Vercel without the header", () => {
    expect(clientIp(headers(), { VERCEL: "1" })).toBe("unknown");
  });
});

describe("allow", () => {
  function limiter(results: boolean[]): Limiter & { hit: ReturnType<typeof vi.fn> } {
    const hit = vi.fn(async () => results.shift() ?? true);
    return { hit, reset: vi.fn(async () => {}) };
  }

  it("passes when every limit allows and uses the configured windows", async () => {
    const l = limiter([true, true]);
    await expect(
      allow(l, [
        { limit: "sendPerIp", key: "a" },
        { limit: "sendPerDestination", key: "b" },
      ]),
    ).resolves.toBe(true);
    expect(l.hit).toHaveBeenCalledWith("a", LIMITS.sendPerIp.windowSeconds, LIMITS.sendPerIp.max);
    expect(l.hit).toHaveBeenCalledWith("b", 3600, 5);
  });

  it("blocks when any limit is exhausted but still counts every key", async () => {
    const l = limiter([false, true]);
    await expect(
      allow(l, [
        { limit: "sendPerIp", key: "a" },
        { limit: "sendPerDestination", key: "b" },
      ]),
    ).resolves.toBe(false);
    expect(l.hit).toHaveBeenCalledTimes(2);
  });

  it("uses the spec's numbers", () => {
    expect(LIMITS.verifyPerDestination).toEqual({ windowSeconds: 600, max: 5 });
    expect(LIMITS.resendCooldown).toEqual({ windowSeconds: 30, max: 1 });
    expect(LIMITS.profileAddPerUser).toEqual({ windowSeconds: 86_400, max: 5 });
    expect(LIMITS.profileAddPerIp).toEqual({ windowSeconds: 86_400, max: 20 });
  });
});

describe("signed-in-home limits", () => {
  it("give every new limit its own key kind, so no counter is shared", () => {
    const kinds = [
      "ip",
      "dest",
      "resend",
      "verify",
      "user",
      "profile-ip",
      "reverify-user",
      "csp-ip",
      "profile-write-user",
    ] as const;
    const keys = kinds.map((kind) => limiterKey(kind, "same-value", env));
    expect(new Set(keys).size).toBe(kinds.length);
  });

  it("define the re-verify, CSP report and profile write windows", () => {
    expect(LIMITS.reverifyPerUser).toEqual({ windowSeconds: 3600, max: 5 });
    expect(LIMITS.cspReportPerIp).toEqual({ windowSeconds: 3600, max: 60 });
    expect(LIMITS.profileWritePerUser).toEqual({ windowSeconds: 3600, max: 60 });
  });
});
