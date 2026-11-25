import { describe, expect, it } from "vitest";
import { firstName, greetingFor } from "./greeting";

// IST is UTC+05:30, so 05:00 IST is 23:30 UTC the previous day.
const ist = (hhmm: string) => new Date(`2026-11-24T${hhmm}:00+05:30`);

describe("greetingFor (IST)", () => {
  it.each([
    ["00:00", "evening"],
    ["04:59", "evening"],
    ["05:00", "morning"],
    ["11:59", "morning"],
    ["12:00", "afternoon"],
    ["16:59", "afternoon"],
    ["17:00", "evening"],
    ["23:59", "evening"],
  ] as const)("%s IST is %s", (time, expected) => {
    expect(greetingFor(ist(time))).toBe(expected);
  });

  it("reads the hour in IST, not UTC", () => {
    // 23:30 UTC is 05:00 IST the next day.
    expect(greetingFor(new Date("2026-11-23T23:30:00Z"))).toBe("morning");
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("Test Patient Sample")).toBe("Test");
  });

  it("ignores extra spaces", () => {
    expect(firstName("   Test   Patient ")).toBe("Test");
  });

  it("keeps a single-word name", () => {
    expect(firstName("Tester")).toBe("Tester");
  });

  it("returns null for empty input", () => {
    expect(firstName("  ")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
