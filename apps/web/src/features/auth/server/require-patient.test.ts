// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = vi.fn();
const redirect = vi.fn((target: unknown) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { target });
});
vi.mock("./auth-state", () => ({ authState: () => authState() }));
vi.mock("@/i18n/navigation", () => ({ redirect: (target: unknown) => redirect(target) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "hi" }));

const { loginHref, requirePatient } = await import("./require-patient");

afterEach(() => {
  vi.clearAllMocks();
});

describe("loginHref", () => {
  it("sanitises the return path", () => {
    expect(loginHref("//evil.com")).toEqual({ pathname: "/login", query: { next: "/" } });
    expect(loginHref("/account", "finish")).toEqual({
      pathname: "/login",
      query: { next: "/account", step: "finish" },
    });
  });
});

describe("requirePatient", () => {
  it("returns the state for a signed-in patient", async () => {
    authState.mockResolvedValue({ state: "signed_in", fullName: "Asha", user: { id: "u1" } });
    await expect(requirePatient("/account")).resolves.toMatchObject({ state: "signed_in" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["signed_out", { next: "/hi/account" }],
    ["needs_finish", { next: "/hi/account", step: "finish" }],
    ["step_up", { next: "/hi/account", step: "step_up" }],
  ])("redirects %s to /login with %o, keeping the Hindi return path", async (state, query) => {
    authState.mockResolvedValue({ state });
    await expect(requirePatient("/account")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith({ href: { pathname: "/login", query }, locale: "hi" });
  });
});

describe("requirePatient (signed-in-home)", () => {
  it("throws AuthUnavailableError when the gate cannot be read, never redirecting a signed-in user to /login", async () => {
    authState.mockResolvedValue({ state: "unavailable", user: { id: "u1" } });
    await expect(requirePatient("/account")).rejects.toThrow("auth gate unavailable");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("never puts a record id in next", async () => {
    authState.mockResolvedValue({ state: "signed_out" });
    await expect(
      requirePatient("/appointments/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f"),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: { pathname: "/login", query: { next: "/hi/appointments" } },
      }),
    );
  });
});
