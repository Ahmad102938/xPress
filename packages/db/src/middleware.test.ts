import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const createServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

const { classifyClaimsResult, updateSession, updateSessionWithClaims } =
  await import("./middleware");

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
          // A refresh that succeeds also returns the verified claims.
          return { data: { claims: { sub: "u1" } }, error: null };
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

describe("updateSessionWithClaims", () => {
  it("reports none without a session cookie", async () => {
    const result = await updateSessionWithClaims(
      requestWith("NEXT_LOCALE=hi"),
      NextResponse.next(),
    );
    expect(result.session).toBe("none");
  });

  it("reports none when the Supabase env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await updateSessionWithClaims(
      requestWith("sb-127-auth-token=abc"),
      NextResponse.next(),
    );
    expect(result.session).toBe("none");
    warn.mockRestore();
  });

  it("reports valid for verified claims and keeps the cookies", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    const result = await updateSessionWithClaims(
      requestWith("sb-127-auth-token=abc"),
      NextResponse.next(),
    );
    expect(result.session).toBe("valid");
    expect(result.response.cookies.get("sb-127-auth-token")).toBeUndefined();
  });

  it("deletes the auth cookies but keeps the code verifier when Auth rejects the session", async () => {
    getClaims.mockResolvedValue({ data: null, error: { name: "AuthApiError", status: 400 } });
    const request = requestWith(
      "sb-127-auth-token.0=a; sb-127-auth-token.1=b; sb-127-auth-token-code-verifier=v",
    );
    const result = await updateSessionWithClaims(request, NextResponse.next());
    expect(result.session).toBe("invalid");
    expect(result.response.cookies.get("sb-127-auth-token.0")?.maxAge).toBe(0);
    expect(result.response.cookies.get("sb-127-auth-token.1")?.maxAge).toBe(0);
    expect(result.response.cookies.get("sb-127-auth-token-code-verifier")).toBeUndefined();
    expect(request.cookies.has("sb-127-auth-token.0")).toBe(false);
  });

  it("keeps the cookies on a network or server failure", async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: { name: "AuthRetryableFetchError", status: 0 },
    });
    const result = await updateSessionWithClaims(
      requestWith("sb-127-auth-token=abc"),
      NextResponse.next(),
    );
    expect(result.session).toBe("unknown");
    expect(result.response.cookies.get("sb-127-auth-token")).toBeUndefined();
  });

  it("reports unknown when getClaims throws", async () => {
    getClaims.mockRejectedValue(new Error("network down"));
    const result = await updateSessionWithClaims(
      requestWith("sb-127-auth-token=abc"),
      NextResponse.next(),
    );
    expect(result.session).toBe("unknown");
  });
});

describe("classifyClaimsResult", () => {
  it.each([
    [{ data: { claims: { sub: "u" } }, error: null }, "valid"],
    [{ data: null, error: null }, "invalid"],
    [{ data: null, error: { name: "AuthInvalidJwtError", status: 401 } }, "invalid"],
    [{ data: null, error: { name: "AuthApiError", status: 503 } }, "unknown"],
    [{ data: null, error: { name: "AuthRetryableFetchError" } }, "unknown"],
  ] as const)("classifies %j as %s", (result, expected) => {
    expect(classifyClaimsResult(result)).toBe(expected);
  });
});
