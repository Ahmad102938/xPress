import { describe, expect, it } from "vitest";
import { staticHeaders } from "./static-headers";

const value = (headers: Array<{ key: string; value: string }>, key: string) =>
  headers.find((header) => header.key === key)?.value;

describe("staticHeaders", () => {
  it("sets the browser hardening headers", () => {
    const headers = staticHeaders({});
    expect(value(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(value(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(value(headers, "X-Frame-Options")).toBe("DENY");
    expect(value(headers, "Permissions-Policy")).toContain("camera=()");
    expect(value(headers, "Permissions-Policy")).toContain("geolocation=(self)");
  });

  it("sends HSTS only when deployed", () => {
    expect(value(staticHeaders({}), "Strict-Transport-Security")).toBeUndefined();
    expect(value(staticHeaders({ VERCEL: "1" }), "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("never sets a CSP (the proxy sets exactly one per page)", () => {
    expect(
      staticHeaders({ VERCEL: "1" }).some((header) =>
        header.key.startsWith("Content-Security-Policy"),
      ),
    ).toBe(false);
  });
});
