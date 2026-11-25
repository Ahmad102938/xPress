import { describe, expect, it } from "vitest";
import { safeReturnPath, sanitizeNextPath } from "./next-path";

const locales = ["en", "hi"] as const;
const sanitize = (value: unknown) => sanitizeNextPath(value, locales);

describe("sanitizeNextPath: allowed same-site paths", () => {
  it.each([
    ["/"],
    ["/account"],
    ["/appointments"],
    ["/doctors?city=varanasi&page=2"],
    ["/hi/account"],
    ["/hi"],
    ["/doctors#top"],
    ["/search?q=skin%20care"],
  ])("keeps %s", (path) => {
    expect(sanitize(path)).toBe(path);
  });
});

describe("sanitizeNextPath: attack corpus falls back to /", () => {
  it.each([
    ["//evil.com", "protocol-relative URL"],
    ["//evil.com/account", "protocol-relative URL with path"],
    ["/\\evil.com", "backslash host"],
    ["\\\\evil.com", "double backslash"],
    ["/%5Cevil.com", "encoded backslash"],
    ["https://evil.com", "absolute URL"],
    ["javascript:alert(1)", "javascript scheme"],
    ["/javascript:alert(1)", "scheme hidden in a path"],
    ["%2F%2Fevil.com", "encoded double slash"],
    ["/%2F%2Fevil.com", "encoded double slash after a slash"],
    ["/%2Fevil.com", "encoded slash making //"],
    ["/account%0d%0aSet-Cookie:x", "CRLF injection"],
    ["/acc\u0000ount", "NUL byte"],
    ["/acc\tount", "tab"],
    ["account", "relative path"],
    ["", "empty"],
    ["/%E0%A4%A", "malformed encoding"],
    ["/login", "login loop"],
    ["/login?next=/account", "login loop with query"],
    ["/hi/login", "localised login loop"],
    ["/auth/callback", "callback loop"],
    ["/auth", "auth root"],
    ["/AUTH/session", "auth loop in upper case"],
    [`/${"a".repeat(2050)}`, "overlong"],
  ])("rejects %s (%s)", (path) => {
    expect(sanitize(path)).toBe("/");
  });

  it.each([[undefined], [null], [42], [["/account"]]])("rejects non-string %s", (value) => {
    expect(sanitize(value)).toBe("/");
  });

  it("does not treat /logins or /authors as auth routes", () => {
    expect(sanitize("/logins")).toBe("/logins");
    expect(sanitize("/authors")).toBe("/authors");
  });
});

describe("safeReturnPath: never carries a record id", () => {
  const safe = (value: unknown) => safeReturnPath(value, locales);
  const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

  it("cuts a path at its first UUID segment", () => {
    expect(safe(`/appointments/${id}`)).toBe("/appointments");
  });

  it("keeps the Hindi prefix", () => {
    expect(safe(`/hi/appointments/${id}/receipt`)).toBe("/hi/appointments");
  });

  it("matches upper-case and percent-encoded UUIDs", () => {
    expect(safe(`/appointments/${id.toUpperCase()}`)).toBe("/appointments");
    expect(safe(`/appointments/${encodeURIComponent(id)}?tab=past`)).toBe("/appointments");
  });

  it("leaves paths without a UUID unchanged", () => {
    expect(safe("/appointments?tab=past")).toBe("/appointments?tab=past");
  });

  it("still refuses unsafe input", () => {
    expect(safe("//evil.test")).toBe("/");
  });

  it("returns / when the UUID is the first segment", () => {
    expect(safe(`/${id}`)).toBe("/");
  });
});
