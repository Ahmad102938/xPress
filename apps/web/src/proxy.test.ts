// @vitest-environment node
import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateSession = vi.fn(async (_request: NextRequest, response: NextResponse) => response);
vi.mock("@acurexpress/db/middleware", () => ({
  updateSession: (request: NextRequest, response: NextResponse) => updateSession(request, response),
}));

const { default: proxy } = await import("./proxy");

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  updateSession.mockClear();
});

describe("proxy", () => {
  it("never locale-prefixes /auth/* but still refreshes the session", async () => {
    const response = await proxy(request("/auth/callback?code=abc", { "accept-language": "hi" }));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
    expect(updateSession).toHaveBeenCalledOnce();
  });

  it("redirects /en to the unprefixed English URL", async () => {
    const response = await proxy(request("/en/doctors"));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/doctors");
  });

  it("sends a Hindi browser on / to /hi", async () => {
    const response = await proxy(request("/", { "accept-language": "hi-IN,hi;q=0.9" }));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/hi");
  });

  it("passes the locale response to the session refresh", async () => {
    await proxy(request("/doctors"));
    expect(updateSession).toHaveBeenCalledOnce();
    expect(updateSession.mock.calls[0]?.[0].nextUrl.pathname).toBe("/doctors");
  });
});
