import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const deleteUser = vi.fn();
const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

const admin = await import("./admin");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
  createClient.mockImplementation(() => ({ rpc, auth: { admin: { deleteUser } } }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("createAdminClient", () => {
  it("uses the service role key without persisting a session", () => {
    admin.createAdminClient();
    expect(createClient).toHaveBeenCalledWith("http://127.0.0.1:54321", "test-service-role", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it("refuses to run in a browser", () => {
    vi.stubGlobal("window", {});
    expect(() => admin.createAdminClient()).toThrow(/server-only/);
  });

  it("throws without the service role key", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => admin.createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe("limiter and job helpers", () => {
  it("rateLimitHit passes the hashed key and returns the decision", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(admin.rateLimitHit("a".repeat(64), 600, 5)).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_key_hash: "a".repeat(64),
      p_window_seconds: 600,
      p_max: 5,
    });
  });

  it("rateLimitHit throws without leaking the key when the call fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(admin.rateLimitHit("b".repeat(64), 600, 5)).rejects.toThrow(
      "rate_limit_hit failed",
    );
  });

  it("unconfirmedUsersOlderThan asks for at least one hour", async () => {
    rpc.mockResolvedValue({ data: ["u1"], error: null });
    await expect(admin.unconfirmedUsersOlderThan(24)).resolves.toEqual(["u1"]);
    expect(rpc).toHaveBeenCalledWith("unconfirmed_users_older_than", { p_age: "24 hours" });
    await admin.unconfirmedUsersOlderThan(0);
    expect(rpc).toHaveBeenLastCalledWith("unconfirmed_users_older_than", { p_age: "1 hours" });
  });

  it("completeStepUpServer sends the user and session ids", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await admin.completeStepUpServer("user-1", "session-1");
    expect(rpc).toHaveBeenCalledWith("complete_step_up_server", {
      p_user_id: "user-1",
      p_session_id: "session-1",
    });
  });

  it("deleteAuthUser uses the Auth admin API", async () => {
    deleteUser.mockResolvedValue({ error: null });
    await admin.deleteAuthUser("user-2");
    expect(deleteUser).toHaveBeenCalledWith("user-2");
  });
});
