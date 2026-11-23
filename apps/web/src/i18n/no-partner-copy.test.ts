import { uiMessages } from "@acurexpress/ui";
import { describe, expect, it } from "vitest";
import { adminTextFound, partnerTextFound } from "@/test/partner-free";
import en from "./messages/en.json";
import hi from "./messages/hi.json";

type Tree = { [key: string]: string | Tree };

function entries(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (key === "_meta") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value] as [string, string]] : entries(value, path);
  });
}

/** The footer partner band is the only place partner wording is allowed. */
const PARTNER_NAMESPACE = "partnerBand.";

describe("patient-site copy", () => {
  for (const [name, messages] of [
    ["en", { ...uiMessages.en, ...en }],
    ["hi", { ...uiMessages.hi, ...hi }],
  ] as const) {
    const all = entries(messages as Tree);

    it(`${name}: partner wording appears only in the footer partner band strings`, () => {
      const offending = all
        .filter(([key]) => !key.startsWith(PARTNER_NAMESPACE))
        .map(([key, value]) => [key, partnerTextFound(value)] as const)
        .filter(([, hits]) => hits.length > 0);
      expect(offending).toEqual([]);
    });

    it(`${name}: no string anywhere mentions admin or HCQ staff`, () => {
      const offending = all.filter(([, value]) => adminTextFound(value).length > 0);
      expect(offending).toEqual([]);
    });
  }

  it("the removed partner namespaces and keys are gone", () => {
    expect(en).not.toHaveProperty("joinUs");
    expect(en.header).not.toHaveProperty("becomePartner");
    expect(en.footer).not.toHaveProperty("partners");
    expect(en.pages).not.toHaveProperty("for-doctors");
  });
});
