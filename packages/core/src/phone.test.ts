import { describe, expect, it } from "vitest";
import { maskPhone, normalizeIndianPhone } from "./phone";

describe("normalizeIndianPhone", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+919876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["  6000000000 ", "+916000000000"],
    ["9123456789", "+919123456789"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each([
    ["5876543210", "leading digit 5"],
    ["0123456789", "leading digit 0 after prefix strip"],
    ["987654321", "9 digits"],
    ["98765432100", "11 digits without prefix"],
    ["+14155550123", "US number"],
    ["+449876543210", "UK prefix"],
    ["98765abc10", "letters"],
    ["", "empty"],
    ["(987) 654-3210", "brackets"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeIndianPhone(input)).toBeNull();
  });
});

describe("maskPhone", () => {
  it("keeps the first two and last two digits", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98XXXXXX10");
  });

  it("fully masks anything that is not a normalised number", () => {
    expect(maskPhone("9876543210")).toBe("+91 XXXXXXXXXX");
  });
});
