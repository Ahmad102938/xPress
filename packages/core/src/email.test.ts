import { describe, expect, it } from "vitest";
import { maskEmail, normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Test.User@Example.TEST ")).toBe("test.user@example.test");
  });
});

describe("maskEmail", () => {
  it("shows only the first character and the domain", () => {
    expect(maskEmail("test@example.test")).toBe("t•••@example.test");
  });

  it("fully masks a value without a local part", () => {
    expect(maskEmail("@example.test")).toBe("•••");
    expect(maskEmail("no-at-sign")).toBe("•••");
  });
});
