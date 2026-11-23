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
