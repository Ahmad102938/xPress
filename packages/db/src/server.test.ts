import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    createClient(...args);
    return {};
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));

const { createOtpSenderClient } = await import("./server");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createOtpSenderClient", () => {
  it("is cookie-less so a code send never touches the PKCE verifier", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    createOtpSenderClient();
    expect(createClient).toHaveBeenCalledWith("http://127.0.0.1:54321", "test-anon-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
});
