import { describe, expect, it } from "vitest";
import { buildCsp, createNonce, reportingEndpointsHeader } from "./csp";

const base = { NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" };
const directive = (csp: string, name: string) =>
  csp.split("; ").find((part) => part.startsWith(`${name} `) || part === name) ?? "";

describe("buildCsp: private level (R2)", () => {
  const csp = buildCsp({ level: "private", nonce: "abc123", env: base });

  it("uses the nonce with strict-dynamic and never unsafe-inline for scripts", () => {
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(directive(csp, "script-src")).not.toContain("unsafe-inline");
  });
});

describe("buildCsp: public level", () => {
  it("allows inline scripts only on the public level, without third parties", () => {
    const csp = buildCsp({ level: "public", env: base });
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
  });
});

describe("buildCsp: both levels", () => {
  it.each(["public", "private"] as const)(
    "%s always blocks framing, plugins and base changes",
    (level) => {
      const csp = buildCsp({ level, nonce: "n", env: base });
      expect(directive(csp, "default-src")).toBe("default-src 'self'");
      expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(directive(csp, "object-src")).toBe("object-src 'none'");
      expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
      expect(directive(csp, "report-uri")).toBe("report-uri /api/csp-report");
      expect(directive(csp, "report-to")).toBe("report-to csp");
      expect(directive(csp, "img-src")).toBe("img-src 'self' data: blob:");
      expect(directive(csp, "connect-src")).toBe("connect-src 'self' https://project.supabase.co");
    },
  );

  it("allows Turnstile only when its site key is set", () => {
    expect(buildCsp({ level: "public", env: base })).not.toContain("challenges.cloudflare.com");
    const withKey = buildCsp({
      level: "private",
      nonce: "n",
      env: { ...base, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "key" },
    });
    expect(directive(withKey, "script-src")).toContain("https://challenges.cloudflare.com");
    expect(directive(withKey, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
  });

  it("adds unsafe-eval in development only", () => {
    expect(buildCsp({ level: "public", env: base })).not.toContain("unsafe-eval");
    expect(buildCsp({ level: "public", env: { ...base, NODE_ENV: "development" } })).toContain(
      "'unsafe-eval'",
    );
  });

  it("upgrades insecure requests only when deployed", () => {
    expect(buildCsp({ level: "public", env: base })).not.toContain("upgrade-insecure-requests");
    expect(buildCsp({ level: "public", env: { ...base, VERCEL: "1" } })).toContain(
      "upgrade-insecure-requests",
    );
  });
});

describe("helpers", () => {
  it("names the reporting endpoint", () => {
    expect(reportingEndpointsHeader()).toBe('csp="/api/csp-report"');
  });

  it("creates a fresh 128-bit nonce each time", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});
