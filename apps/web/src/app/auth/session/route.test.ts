// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.fn();
vi.mock("@/features/auth/server/auth-state", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/server/auth-state")>(
    "@/features/auth/server/auth-state",
  );
  return { ...actual, authState: () => authState() };
});

const { GET } = await import("./route");

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /auth/session", () => {
  it("returns the signed-in view without contact details and is never cached", async () => {
    authState.mockResolvedValue({
      state: "signed_in",
      fullName: "Asha Devi",
      avatarUrl: "https://example.test/a.png",
      user: { email: "a@example.test", phone: "919000000001" },
    });
    const response = await GET();
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body).toEqual({
      state: "signed_in",
      name: "Asha Devi",
      avatarUrl: "https://example.test/a.png",
      initials: "AD",
    });
    expect(JSON.stringify(body)).not.toMatch(/example\.test\b(?!\/)|9000000001/);
  });

  it("shows only the gate state while sign-up is unfinished", async () => {
    authState.mockResolvedValue({ state: "needs_finish", fullName: null, avatarUrl: null });
    await expect((await GET()).json()).resolves.toEqual({
      state: "needs_finish",
      name: null,
      avatarUrl: null,
      initials: "",
    });
  });

  it("fails safe to signed_out", async () => {
    authState.mockRejectedValue(new Error("db down"));
    await expect((await GET()).json()).resolves.toMatchObject({ state: "signed_out" });
  });
});
