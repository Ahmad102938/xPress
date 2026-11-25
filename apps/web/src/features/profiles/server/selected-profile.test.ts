import { describe, expect, it } from "vitest";
import { chooseSelected, type PatientProfile } from "./selected-profile";

const profile = (over: Partial<PatientProfile>): PatientProfile => ({
  id: "self",
  fullName: "Test Patient",
  dateOfBirth: null,
  gender: null,
  consultationLanguage: null,
  contactPhone: null,
  relationship: "self",
  archived: false,
  isSelf: true,
  ...over,
});

const self = profile({});
const child = profile({
  id: "child",
  fullName: "Test Child",
  relationship: "child",
  isSelf: false,
});
const archived = profile({
  id: "old",
  fullName: "Test Old",
  relationship: "parent",
  isSelf: false,
  archived: true,
});
const all = [self, child, archived];

describe("chooseSelected", () => {
  it("is self without a cookie, with no notice", () => {
    expect(chooseSelected(all, undefined)).toEqual({ profile: self, fellBack: false });
  });

  it("is the cookie's profile when it is active", () => {
    expect(chooseSelected(all, "child")).toEqual({ profile: child, fellBack: false });
  });

  it("falls back to self with a notice for an archived profile", () => {
    expect(chooseSelected(all, "old")).toEqual({ profile: self, fellBack: true });
  });

  it("falls back to self with a notice for a forged or unknown id", () => {
    expect(chooseSelected(all, "someone-elses-profile-id")).toEqual({
      profile: self,
      fellBack: true,
    });
  });

  it("is null when the account has no self profile", () => {
    expect(chooseSelected([child], undefined)).toBeNull();
  });
});
