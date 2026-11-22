import { describe, expect, it } from "vitest";
import { uiMessages } from ".";

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (key === "_meta") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafKeys(value, path);
  });
}

describe("ui message catalogues", () => {
  it("Hindi has exactly the same keys as English", () => {
    expect(leafKeys(uiMessages.hi as Tree).sort()).toEqual(leafKeys(uiMessages.en as Tree).sort());
  });

  it("keeps the two badge levels distinct in wording", () => {
    expect(uiMessages.en.badges.verified).not.toBe(uiMessages.en.badges.registered);
    expect(uiMessages.hi.badges.verified).not.toBe(uiMessages.hi.badges.registered);
  });
});
