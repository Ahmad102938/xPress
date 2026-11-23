// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@acurexpress/db/server", () => ({
  createClient: async () => ({ auth: { getUser }, rpc }),
}));
vi.mock("@acurexpress/db", () => ({ hasSupabaseEnv: () => process.env.TEST_NO_SUPABASE !== "1" }));

const { authState, decideGate, initialsOf } = await import("./auth-state");

const user = {
  id: "u1",
  email: "a.patient@example.test",
  email_confirmed_at: "2026-11-23T00:00:00Z",
  identities: [{ provider: "email" }, { provider: "google" }],
  user_metadata: { avatar_url: "https://example.test/a.png" },
};

function gate(state: Record<string, unknown>) {
  rpc.mockImplementation(async (name: string) =>
    name === "my_auth_state" ? { data: state, error: null } : { data: null, error: null },
  );
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user }, error: null });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("decideGate", () => {
  it.each([
    [
      { hasUser: false, hasProfile: false, hasCurrentTerms: false, needsStepUp: false },
      "signed_out",
    ],
    [
      { hasUser: true, hasProfile: false, hasCurrentTerms: false, needsStepUp: false },
      "needs_finish",
    ],
    [
      { hasUser: true, hasProfile: true, hasCurrentTerms: false, needsStepUp: true },
      "needs_finish",
    ],
    [{ hasUser: true, hasProfile: true, hasCurrentTerms: true, needsStepUp: true }, "step_up"],
    [{ hasUser: true, hasProfile: true, hasCurrentTerms: true, needsStepUp: false }, "signed_in"],
  ] as const)("%o -> %s", (input, expected) => {
    expect(decideGate(input)).toBe(expected);
  });
});

describe("authState", () => {
  it("is signed_out without Supabase env and makes no call", async () => {
    vi.stubEnv("TEST_NO_SUPABASE", "1");
    await expect(authState()).resolves.toMatchObject({ state: "signed_out", user: null });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("is signed_out without a user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found" } });
    await expect(authState()).resolves.toMatchObject({ state: "signed_out" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("records activity before reading the gate state", async () => {
    gate({
      has_profile: true,
      has_current_terms: true,
      needs_step_up: false,
      full_name: "Asha Devi",
    });
    await authState();
    expect(rpc.mock.calls.map((call) => call[0])).toEqual(["touch_last_seen", "my_auth_state"]);
  });

  it("returns needs_finish without a current Terms consent", async () => {
    gate({ has_profile: true, has_current_terms: false, needs_step_up: false });
    await expect(authState()).resolves.toMatchObject({ state: "needs_finish" });
  });

  it("returns step_up with masked options for the account", async () => {
    gate({
      has_profile: true,
      has_current_terms: true,
      needs_step_up: true,
      full_name: "Asha Devi",
    });
    await expect(authState()).resolves.toMatchObject({
      state: "step_up",
      stepUp: { maskedEmail: "a•••@example.test", google: true },
    });
  });

  it("returns signed_in with the name and https avatar", async () => {
    gate({
      has_profile: true,
      has_current_terms: true,
      needs_step_up: false,
      full_name: "Asha Devi",
    });
    await expect(authState()).resolves.toMatchObject({
      state: "signed_in",
      fullName: "Asha Devi",
      avatarUrl: "https://example.test/a.png",
    });
  });
});

describe("initialsOf", () => {
  it.each([
    ["Asha Devi", "AD"],
    ["asha", "A"],
    ["Asha Kumari Devi", "AD"],
    ["राम प्रसाद", "रप"],
    [null, ""],
  ])("%s -> %s", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
