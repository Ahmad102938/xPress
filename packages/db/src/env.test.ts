import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabasePublicEnv, hasSupabaseEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabasePublicEnv", () => {
  it("returns the public URL and anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    expect(getSupabasePublicEnv()).toEqual({
      url: "http://127.0.0.1:54321",
      anonKey: "test-anon-key",
    });
  });

  it("throws a setup hint when the env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabasePublicEnv()).toThrow(/Supabase env is missing/);
  });

  it("never exposes the service role key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "must-not-appear");
    expect(JSON.stringify(getSupabasePublicEnv())).not.toContain("must-not-appear");
  });
});

describe("hasSupabaseEnv", () => {
  it("is true when the public URL and anon key are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    expect(hasSupabaseEnv()).toBe(true);
  });

  it("is false without them, so apps can fail safe", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(hasSupabaseEnv()).toBe(false);
  });
});
