import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revokeSessionByToken } from "./session";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("revokeSessionByToken", () => {
  it("posts a scope=local logout with the session's own token", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    expect(await revokeSessionByToken("old-token", fetchImpl)).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:54321/auth/v1/logout?scope=local",
      expect.objectContaining({
        method: "POST",
        headers: { apikey: "test-anon-key", authorization: "Bearer old-token" },
      }),
    );
  });

  it("reports failed for an error status", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 401 }));
    expect(await revokeSessionByToken("old-token", fetchImpl)).toBe("failed");
  });

  it("never throws on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await revokeSessionByToken("old-token", fetchImpl)).toBe("failed");
  });

  it("does nothing without a token", async () => {
    const fetchImpl = vi.fn();
    expect(await revokeSessionByToken("", fetchImpl)).toBe("failed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
