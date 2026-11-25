import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("disallows every private path in English and Hindi, plus auth and api", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toEqual(
      expect.arrayContaining([
        "/appointments",
        "/hi/appointments",
        "/profile",
        "/hi/account",
        "/support",
        "/home",
        "/auth/",
        "/api/",
      ]),
    );
  });
});
