// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.fn();
vi.mock("@/features/auth/server/auth-state", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/server/auth-state")>(
    "@/features/auth/server/auth-state",
  );
  return { ...actual, authState: () => authState() };
});
vi.mock("@acurexpress/db", () => ({ hasSupabaseEnv: () => true }));
const maybeSingle = vi.fn(async () => ({
  data: { label: "Home", pincode: "462001" },
  error: null,
}));
vi.mock("@acurexpress/db/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
  }),
}));
const loadProfileContext = vi.fn();
vi.mock("@/features/profiles/server/selected-profile", () => ({
  loadProfileContext: (...args: unknown[]) => loadProfileContext(...args),
}));

const { GET, maskedContactFor, userTagFor } = await import("./route");

const self = {
  id: "p-self",
  fullName: "Test Patient Sample",
  relationship: "self",
  archived: false,
  isSelf: true,
};
const child = {
  id: "p-child",
  fullName: "Test Child",
  relationship: "child",
  archived: false,
  isSelf: false,
};

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "test-secret");
  loadProfileContext.mockResolvedValue({
    active: [self, child],
    selected: { profile: self, fellBack: false },
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /auth/session", () => {
  it("returns the signed-in view with masked contact and no ids, photos or full contacts; never cached", async () => {
    authState.mockResolvedValue({
      state: "signed_in",
      fullName: "Test Patient Sample",
      user: {
        id: "user-1",
        email: "a.patient@example.test",
        email_confirmed_at: "x",
        phone: "919000004321",
        phone_confirmed_at: "x",
      },
    });
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    const body = await response.json();
    expect(body).toEqual({
      state: "signed_in",
      name: "Test",
      initials: "TS",
      maskedContact: "+91 •••••• 4321",
      userTag: userTagFor("user-1"),
      profiles: [
        { id: "p-self", firstName: "Test", relationship: "self" },
        { id: "p-child", firstName: "Test", relationship: "child" },
      ],
      selectedProfileId: "p-self",
      addressChip: { label: "Home", pin: "462001" },
    });
    expect(JSON.stringify(body)).not.toMatch(/9000004321|a\.patient@|user-1|avatar/);
  });

  it("shows only the gate state while sign-up is unfinished", async () => {
    authState.mockResolvedValue({ state: "needs_finish", fullName: null, user: { id: "user-1" } });
    await expect((await GET()).json()).resolves.toMatchObject({
      state: "needs_finish",
      name: null,
      profiles: [],
      userTag: null,
    });
  });

  it("passes the unavailable gate state through", async () => {
    authState.mockResolvedValue({ state: "unavailable", fullName: null, user: { id: "user-1" } });
    await expect((await GET()).json()).resolves.toMatchObject({
      state: "unavailable",
      maskedContact: null,
    });
  });

  it("fails safe to signed_out", async () => {
    authState.mockRejectedValue(new Error("db down"));
    await expect((await GET()).json()).resolves.toMatchObject({ state: "signed_out" });
  });
});

describe("helpers", () => {
  it("prefers the phone and falls back to the email", () => {
    expect(
      maskedContactFor({
        phone: "",
        phone_confirmed_at: undefined,
        email: "ab@example.test",
        email_confirmed_at: "x",
      }),
    ).toBe("a•••@example.test");
    expect(
      maskedContactFor({
        phone: "",
        phone_confirmed_at: undefined,
        email: "",
        email_confirmed_at: undefined,
      }),
    ).toBeNull();
  });

  it("gives a stable tag that is not the id", () => {
    expect(userTagFor("user-1")).toBe(userTagFor("user-1"));
    expect(userTagFor("user-1")).not.toBe(userTagFor("user-2"));
    expect(userTagFor("user-1")).not.toContain("user-1");
  });
});
