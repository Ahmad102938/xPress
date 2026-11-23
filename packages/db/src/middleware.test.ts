import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const createServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

const { updateSession } = await import("./middleware");

function requestWith(cookie?: string) {
  return new NextRequest("http://localhost:3000/doctors", {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  getClaims.mockResolvedValue({ data: { claims: {} }, error: null });
  createServerClient.mockImplementation(() => ({ auth: { getClaims } }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("updateSession", () => {
  it("makes no Supabase call for visitors without a session cookie", async () => {
    const response = NextResponse.next();
    expect(await updateSession(requestWith("NEXT_LOCALE=hi"), response)).toBe(response);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("checks the claims when a session cookie exists", async () => {
    const response = NextResponse.next();
    await updateSession(requestWith("sb-127-auth-token=abc"), response);
    expect(getClaims).toHaveBeenCalledOnce();
  });

  it("writes refreshed cookies with the 30-day cap and httpOnly options", async () => {
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll([
            {
              name: "sb-127-auth-token",
              value: "new",
              options: { maxAge: 34560000, httpOnly: true, path: "/" },
            },
          ]);
          return { data: null, error: null };
        },
      },
    }));
    const response = NextResponse.next();
    await updateSession(requestWith("sb-127-auth-token=old"), response);
    const cookie = response.cookies.get("sb-127-auth-token");
    expect(cookie?.value).toBe("new");
    expect(cookie?.maxAge).toBe(2_592_000);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("fails safe when the Supabase env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = NextResponse.next();
    expect(await updateSession(requestWith("sb-127-auth-token=abc"), response)).toBe(response);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/sb-127|abc/);
    warn.mockRestore();
  });

  it("returns the response unchanged when Supabase fails", async () => {
    getClaims.mockRejectedValue(new Error("network down"));
    const response = NextResponse.next();
    expect(await updateSession(requestWith("sb-127-auth-token=abc"), response)).toBe(response);
  });
});
