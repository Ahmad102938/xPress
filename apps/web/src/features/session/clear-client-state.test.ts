import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_CHANNEL, clearClientState } from "./clear-client-state";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("clearClientState", () => {
  it("removes acx: keys from both storages and keeps other keys and the delivery location", () => {
    localStorage.setItem("acx:recent-searches", '["dentist"]');
    localStorage.setItem("acx_location", '{"pin":"462001"}');
    localStorage.setItem("other", "1");
    sessionStorage.setItem("acx:reverify-pending", "change_phone");
    clearClientState();
    expect(localStorage.getItem("acx:recent-searches")).toBeNull();
    expect(sessionStorage.getItem("acx:reverify-pending")).toBeNull();
    expect(localStorage.getItem("acx_location")).not.toBeNull();
    expect(localStorage.getItem("other")).toBe("1");
  });

  it("tells other tabs", () => {
    const postMessage = vi.fn();
    const names: string[] = [];
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        constructor(name: string) {
          names.push(name);
        }
        postMessage = postMessage;
        close() {}
      },
    );
    clearClientState();
    expect(names).toEqual([AUTH_CHANNEL]);
    expect(postMessage).toHaveBeenCalledWith("signed_out");
  });
});
