import { describe, expect, it } from "vitest";
import { parseFlags } from "@acurexpress/core";
import { sectionsToRender } from "./outline";

const flags = parseFlags({});
const newAccount = {
  presence: { attention: false, yourDoctors: false, nearYou: true },
  completeProfile: { needsPhone: true, needsAddress: true },
  dismissed: false,
};

describe("sectionsToRender", () => {
  it("gives a brand-new account greeting, Up next, Near you and Complete your profile", () => {
    expect(sectionsToRender(newAccount, flags)).toEqual([
      "greeting",
      "complete_profile",
      "up_next",
      "promo_banner",
      "continue_where_left",
      "explore",
      "near_you",
      "shops_near_you",
      "help_support",
      "emergency_line",
    ]);
  });

  it("hides sections with no data, but never Up next", () => {
    const outline = sectionsToRender(
      { ...newAccount, presence: { attention: false, yourDoctors: false, nearYou: false } },
      flags,
    );
    expect(outline).toContain("up_next");
    expect(outline).not.toContain("needs_attention");
    expect(outline).not.toContain("your_doctors");
    expect(outline).not.toContain("near_you");
  });

  it("shows every section for a full fixture account with the AI flag on", () => {
    const outline = sectionsToRender(
      {
        presence: { attention: true, yourDoctors: true, nearYou: true },
        completeProfile: { needsPhone: true, needsAddress: false },
        dismissed: false,
      },
      parseFlags({ FLAG_AI_CONSULTANT: "true" }),
    );
    expect(outline).toEqual([
      "greeting",
      "complete_profile",
      "up_next",
      "needs_attention",
      "promo_banner",
      "continue_where_left",
      "your_doctors",
      "explore",
      "near_you",
      "shops_near_you",
      "ai_card",
      "help_support",
      "emergency_line",
    ]);
  });

  it("hides the AI card while the flag is off", () => {
    expect(sectionsToRender(newAccount, flags)).not.toContain("ai_card");
  });

  it("hides the shop map while the shop network is off", () => {
    expect(sectionsToRender(newAccount, parseFlags({ FLAG_SHOP_NETWORK: "false" }))).not.toContain(
      "shops_near_you",
    );
  });

  it("hides Complete your profile once dismissed or complete", () => {
    expect(sectionsToRender({ ...newAccount, dismissed: true }, flags)).not.toContain(
      "complete_profile",
    );
    expect(
      sectionsToRender(
        { ...newAccount, completeProfile: { needsPhone: false, needsAddress: false } },
        flags,
      ),
    ).not.toContain("complete_profile");
  });
});
