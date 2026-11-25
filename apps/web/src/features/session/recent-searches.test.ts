import { afterEach, describe, expect, it } from "vitest";
import {
  RECENT_SEARCHES_KEY,
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
} from "./recent-searches";

afterEach(() => localStorage.clear());

describe("recent searches (device only)", () => {
  it("keeps the newest first, without duplicates, at most 5", () => {
    for (const query of ["dentist", "skin", "eye", "ent", "child doctor", "Dentist", "heart"])
      addRecentSearch(query);
    expect(readRecentSearches()).toEqual(["heart", "Dentist", "child doctor", "ent", "eye"]);
  });

  it("ignores very short queries and trims spaces", () => {
    addRecentSearch(" a ");
    addRecentSearch("  general   physician ");
    expect(readRecentSearches()).toEqual(["general physician"]);
  });

  it("is stored under the acx: prefix so sign-out clears it", () => {
    addRecentSearch("dentist");
    expect(RECENT_SEARCHES_KEY.startsWith("acx:")).toBe(true);
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toContain("dentist");
  });

  it("clears and survives bad stored data", () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, "{not json");
    expect(readRecentSearches()).toEqual([]);
    addRecentSearch("dentist");
    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
  });
});
