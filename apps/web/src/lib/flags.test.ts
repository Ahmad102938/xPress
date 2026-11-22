import { describe, expect, it } from "vitest";
import { flagDefinitions, parseFlags } from "./flags";

describe("parseFlags", () => {
  it("keeps every regulated / later-phase flag off by default", () => {
    const flags = parseFlags({});
    expect(flags.medicineSales).toBe(false);
    expect(flags.onlinePrescribing).toBe(false);
    expect(flags.aiConsultant).toBe(false);
    expect(flags.nativeAppFeatures).toBe(false);
  });

  it("defaults the shop network on (Phase 1, not regulated)", () => {
    expect(parseFlags({}).shopNetwork).toBe(true);
    expect(parseFlags({ FLAG_SHOP_NETWORK: "false" }).shopNetwork).toBe(false);
  });

  it("turns a flag on only for the string 'true' (case-insensitive)", () => {
    expect(parseFlags({ FLAG_MEDICINE_SALES: "true" }).medicineSales).toBe(true);
    expect(parseFlags({ FLAG_MEDICINE_SALES: " TRUE " }).medicineSales).toBe(true);
    for (const value of ["1", "yes", "on", "", "truthy"]) {
      expect(parseFlags({ FLAG_MEDICINE_SALES: value }).medicineSales).toBe(false);
    }
  });

  it("returns a frozen object with every defined flag", () => {
    const flags = parseFlags({});
    expect(Object.isFrozen(flags)).toBe(true);
    expect(Object.keys(flags).sort()).toEqual(Object.keys(flagDefinitions).sort());
  });
});
