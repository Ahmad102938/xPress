import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import hi from "./messages/hi.json";

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (key === "_meta") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafKeys(value, path);
  });
}

function leafValues(tree: Tree): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    key === "_meta" ? [] : typeof value === "string" ? [value] : leafValues(value),
  );
}

describe("message catalogues", () => {
  it("Hindi has exactly the same keys as English", () => {
    expect(leafKeys(hi as Tree).sort()).toEqual(leafKeys(en as Tree).sort());
  });

  it("has no empty strings", () => {
    for (const value of [...leafValues(en as Tree), ...leafValues(hi as Tree)]) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("keeps the AI disclaimer and emergency number in both languages", () => {
    expect(en.promos.ai.disclaimer).toContain("not a medical diagnosis");
    expect(en.emergency.message).toContain("112");
    expect(hi.emergency.message).toContain("112");
    expect(hi.footer.disclaimer).toContain("112");
  });
});
