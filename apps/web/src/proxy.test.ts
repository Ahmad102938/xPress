// @vitest-environment node
import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Hint = "none" | "valid" | "invalid" | "unknown";
let hint: Hint = "none";
const updateSessionWithClaims = vi.fn(async (_request: NextRequest, response: NextResponse) => ({
  response,
  session: hint,
}));
vi.mock("@acurexpress/db/middleware", () => ({
  updateSessionWithClaims: (request: NextRequest, response: NextResponse) =>
    updateSessionWithClaims(request, response),
}));

const { default: proxy } = await import("./proxy");

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}
const rewriteOf = (response: Response) => {
  const value = response.headers.get("x-middleware-rewrite");
  return value ? new URL(value).pathname : null;
};
const scriptSrc = (response: Response) =>
  (response.headers.get("content-security-policy") ?? "")
    .split("; ")
    .find((part) => part.startsWith("script-src")) ?? "";

beforeEach(() => {
  hint = "none";
  updateSessionWithClaims.mockClear();
});

describe("proxy: locale and session refresh", () => {
  it("never locale-prefixes /auth/* but still refreshes the session", async () => {
    const response = await proxy(request("/auth/callback?code=abc", { "accept-language": "hi" }));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
    expect(updateSessionWithClaims).toHaveBeenCalledOnce();
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
});

describe("proxy: the dual-state home", () => {
  it("serves the public home for a visitor without a session (no rewrite to /home, public CSP)", async () => {
    const response = await proxy(request("/"));
    expect(rewriteOf(response)).toBe("/en");
    expect(scriptSrc(response)).toBe("script-src 'self' 'unsafe-inline'");
    expect(response.headers.get("cache-control")).toBeNull();
    // next-intl's NEXT_LOCALE language cookie (no user data) is the only cookie, as before.
    expect(response.headers.get("set-cookie") ?? "").not.toMatch(/sb-|acx_/);
  });

  it("rewrites / to the signed-in home for a verified session, with the private headers", async () => {
    hint = "valid";
    const response = await proxy(request("/", { cookie: "sb-127-auth-token=abc" }));
    expect(rewriteOf(response)).toBe("/en/home");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(scriptSrc(response)).toMatch(
      /^script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'$/,
    );
  });

  it("keeps the Hindi prefix in the rewrite", async () => {
    hint = "valid";
    expect(rewriteOf(await proxy(request("/hi", { cookie: "sb-127-auth-token=abc" })))).toBe(
      "/hi/home",
    );
  });

  it("lets the page decide when the session could not be checked (outage)", async () => {
    hint = "unknown";
    expect(rewriteOf(await proxy(request("/", { cookie: "sb-127-auth-token=abc" })))).toBe(
      "/en/home",
    );
  });

  it("serves the public home for an invalid session", async () => {
    hint = "invalid";
    expect(rewriteOf(await proxy(request("/", { cookie: "sb-127-auth-token=abc" })))).toBe("/en");
  });

  it("sends a direct /home request back to /", async () => {
    const response = await proxy(request("/home"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/");
    expect(updateSessionWithClaims).not.toHaveBeenCalled();
  });

  it("sends a direct /hi/home request back to /hi", async () => {
    const response = await proxy(request("/hi/home"));
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/hi");
  });
});

describe("proxy: private and public pages", () => {
  it("gives private pages a fresh nonce CSP, no-store and noindex, whatever the session", async () => {
    const first = await proxy(request("/appointments"));
    const second = await proxy(request("/hi/account"));
    expect(first.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(second.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(scriptSrc(first)).toContain("'strict-dynamic'");
    expect(scriptSrc(first)).not.toBe(scriptSrc(second));
  });

  it("passes the nonce and a request id to server code through request headers", async () => {
    const response = await proxy(request("/profile"));
    const overrides = response.headers.get("x-middleware-override-headers") ?? "";
    expect(overrides).toContain("x-nonce");
    expect(overrides).toContain("x-request-id");
    expect(overrides).toContain("content-security-policy");
    const nonce = response.headers.get("x-middleware-request-x-nonce");
    expect(scriptSrc(response)).toContain(`'nonce-${nonce}'`);
  });

  it("never lets a client-sent nonce through on a public page", async () => {
    const response = await proxy(request("/doctors", { "x-nonce": "attacker" }));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
    expect(scriptSrc(response)).toBe("script-src 'self' 'unsafe-inline'");
  });

  it("gives public pages one public-level CSP and no no-store", async () => {
    const response = await proxy(request("/doctors"));
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("cache-control")).toBeNull();
  });
});

describe("proxy: rewrite keeps the query string", () => {
  it("passes ?query through to the signed-in home", async () => {
    hint = "valid";
    const response = await proxy(
      request("/?ref=sms&tab=past", { cookie: "sb-127-auth-token=abc" }),
    );
    const target = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(target.pathname).toBe("/en/home");
    expect(target.search).toBe("?ref=sms&tab=past");
  });
});
