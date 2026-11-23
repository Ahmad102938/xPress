import { describe, expect, it } from "vitest";
import {
  authCookieOptions,
  hasSupabaseAuthCookie,
  isDeployed,
  SESSION_MAX_AGE_SECONDS,
  withSessionMaxAge,
} from "./cookies";

describe("authCookieOptions", () => {
  it("is httpOnly, lax and not secure locally", () => {
    expect(authCookieOptions({})).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: false,
    });
  });

  it("is secure on Vercel", () => {
    expect(authCookieOptions({ VERCEL: "1" }).secure).toBe(true);
  });
});

describe("isDeployed", () => {
  it("is true only on Vercel", () => {
    expect(isDeployed({ VERCEL: "1" })).toBe(true);
    expect(isDeployed({})).toBe(false);
    expect(isDeployed({ VERCEL: "0" })).toBe(false);
  });
});

describe("withSessionMaxAge", () => {
  it("caps a session cookie at 30 days", () => {
    expect(withSessionMaxAge({ maxAge: 400 * 24 * 60 * 60, httpOnly: true })).toEqual({
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
    });
    expect(SESSION_MAX_AGE_SECONDS).toBe(2_592_000);
  });

  it("leaves a removal (maxAge 0) unchanged", () => {
    expect(withSessionMaxAge({ maxAge: 0 })).toEqual({ maxAge: 0 });
  });

  it("leaves options without maxAge unchanged", () => {
    expect(withSessionMaxAge({ path: "/" })).toEqual({ path: "/" });
  });
});

describe("hasSupabaseAuthCookie", () => {
  it("detects whole and chunked session cookies", () => {
    expect(hasSupabaseAuthCookie(["NEXT_LOCALE", "sb-127-auth-token"])).toBe(true);
    expect(hasSupabaseAuthCookie(["sb-abc-auth-token.0"])).toBe(true);
  });

  it("ignores other cookies, including the PKCE verifier alone", () => {
    expect(hasSupabaseAuthCookie(["NEXT_LOCALE"])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-abc-auth-token-code-verifier"])).toBe(false);
    expect(hasSupabaseAuthCookie([])).toBe(false);
  });
});
