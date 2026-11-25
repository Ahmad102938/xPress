import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const signOutAction = vi.fn(async () => {
  calls.push("action");
  return { ok: true };
});
vi.mock("@/features/auth/actions", () => ({ signOutAction: () => signOutAction() }));
vi.mock("./clear-client-state", () => ({ clearClientState: () => calls.push("clear") }));

const { useSignOut } = await import("./use-sign-out");
const replace = vi.fn((url: string) => calls.push(`replace:${url}`));

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal("location", { ...window.location, replace });
});
afterEach(() => vi.unstubAllGlobals());

describe("useSignOut", () => {
  it("ends the session, clears device state, then loads a fresh document", async () => {
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current.signOut());
    expect(calls).toEqual(["action", "clear", "replace:/"]);
  });

  it("still clears and leaves when the action fails", async () => {
    signOutAction.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useSignOut("/contact"));
    await act(() => result.current.signOut());
    expect(calls).toEqual(["clear", "replace:/contact"]);
  });
});
