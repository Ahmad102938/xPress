import { describe, expect, it } from "vitest";
import { SESSION_IDLE_DEFAULT_MINUTES, idleWarningLeadMs, parseMinutes } from "./session-config";

describe("parseMinutes", () => {
  it("uses the fallback when unset", () => {
    expect(parseMinutes(undefined, SESSION_IDLE_DEFAULT_MINUTES)).toBe(30);
  });

  it.each([
    ["1", 1],
    ["45", 45],
    ["1440", 1440],
    [" 20 ", 20],
  ] as const)("accepts %s", (value, expected) => {
    expect(parseMinutes(value, 30)).toBe(expected);
  });

  it.each([["0"], ["1441"], ["-5"], ["2.5"], ["abc"], [""]])("rejects %s", (value) => {
    expect(parseMinutes(value, 30)).toBe(30);
  });
});

describe("idleWarningLeadMs", () => {
  it("warns 2 minutes before a 30-minute timeout", () => {
    expect(idleWarningLeadMs(30 * 60_000)).toBe(120_000);
  });

  it("warns a quarter of the way before a short timeout", () => {
    expect(idleWarningLeadMs(4 * 60_000)).toBe(60_000);
  });
});
