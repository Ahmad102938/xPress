import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivatePageGuard } from "./private-page-guard";

const replace = vi.fn();
let answers: Array<{ state: string; userTag?: string | null }> = [];

function restoreFromBfcache() {
  const event = new Event("pageshow") as PageTransitionEvent;
  Object.defineProperty(event, "persisted", { value: true });
  window.dispatchEvent(event);
}

beforeEach(() => {
  document.body.innerHTML = '<main id="main">Private</main>';
  vi.stubGlobal("location", { ...window.location, replace });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(answers.shift() ?? { state: "signed_out" }))),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("PrivatePageGuard", () => {
  it("keeps the page for the same signed-in person after a back-forward restore", async () => {
    answers = [
      { state: "signed_in", userTag: "tag-a" },
      { state: "signed_in", userTag: "tag-a" },
    ];
    render(<PrivatePageGuard />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    restoreFromBfcache();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(document.getElementById("main")?.hasAttribute("hidden")).toBe(false),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves for / when the restored page belongs to a signed-out session", async () => {
    answers = [{ state: "signed_in", userTag: "tag-a" }, { state: "signed_out" }];
    render(<PrivatePageGuard />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    restoreFromBfcache();
    expect(document.getElementById("main")?.hasAttribute("hidden")).toBe(true);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("leaves for / when a different person is now signed in", async () => {
    answers = [
      { state: "signed_in", userTag: "tag-a" },
      { state: "signed_in", userTag: "tag-b" },
    ];
    render(<PrivatePageGuard />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    restoreFromBfcache();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("ignores a normal page show", async () => {
    answers = [{ state: "signed_in", userTag: "tag-a" }];
    render(<PrivatePageGuard />);
    window.dispatchEvent(new Event("pageshow"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
  });
});
