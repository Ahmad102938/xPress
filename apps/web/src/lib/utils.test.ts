import { describe, expect, it } from "vitest";
import { cn, formatInr } from "./utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
  });
});

describe("formatInr", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatInr(1500, "en")).toBe("₹1,500");
  });
});
