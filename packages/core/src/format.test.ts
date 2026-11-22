import { describe, expect, it } from "vitest";
import { formatInr } from "./format";

describe("formatInr", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatInr(1500, "en")).toBe("₹1,500");
  });
});
