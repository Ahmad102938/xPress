import { describe, expect, it } from "vitest";
import { company, displayValue, isPlaceholder, showPlaceholders } from "./company";

describe("company config", () => {
  it("shows placeholders only in development", () => {
    expect(showPlaceholders("development")).toBe(true);
    expect(showPlaceholders("production")).toBe(false);
    expect(showPlaceholders("test")).toBe(false);
  });

  it("hides TODO_HCQ values unless placeholders are visible", () => {
    expect(isPlaceholder(company.cin)).toBe(true);
    expect(displayValue(company.cin, false)).toBeNull();
    expect(displayValue(company.cin, true)).toBe(company.cin);
    expect(displayValue("support@example.test", false)).toBe("support@example.test");
    expect(displayValue(null, true)).toBeNull();
  });

  it("ships no unconfirmed contact or registration values and no social URLs", () => {
    for (const value of [
      company.registeredOffice,
      company.cin,
      company.gstin,
      company.support.email,
      company.support.phone,
      company.support.hours,
    ]) {
      expect(isPlaceholder(value), value).toBe(true);
    }
    expect(Object.values(company.social).every((url) => url === null)).toBe(true);
    expect(company.paymentsEnabled).toBe(false);
  });
});
