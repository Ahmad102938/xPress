import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseFlags } from "@acurexpress/core";
import { showStoreClaims, trustClaims } from "@/config/trust-strip";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import { renderWithIntl } from "@/test/render";
import { ServicePromises } from "./service-promises";

describe("Store claims strip (config/trust-strip.ts)", () => {
  it("config: exactly the four owner-approved claims, all awaiting HCQ confirmation, none flagged", () => {
    expect(showStoreClaims).toBe(true);
    expect(trustClaims.map((c) => c.id)).toEqual([
      "freeDelivery",
      "support",
      "authentic",
      "bestPrices",
    ]);
    expect(trustClaims.every((c) => c.needsHcqConfirmation)).toBe(true);
    expect(trustClaims.every((c) => !c.requiresFlag)).toBe(true);
  });

  it("en: the four claims with their exact wording", () => {
    renderWithIntl(<ServicePromises />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    for (const [title, body] of [
      ["Free Delivery", "On orders over ₹499"],
      ["24/7 Support", "Dedicated helpline"],
      ["Authentic Products", "100% guaranteed"],
      ["Best Prices", "Price match guarantee"],
    ]) {
      expect(screen.getByText(title!)).toBeInTheDocument();
      expect(screen.getByText(body!)).toBeInTheDocument();
    }
  });

  it("hi: the four claims in Hindi", () => {
    renderWithIntl(<ServicePromises />, { locale: "hi" });
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    for (const id of ["freeDelivery", "support", "authentic", "bestPrices"] as const) {
      expect(screen.getByText(hi.promises[id].title)).toBeInTheDocument();
    }
    expect(screen.getByText(/₹499/)).toBeInTheDocument();
  });

  it("showStoreClaims=false hides the whole strip", () => {
    const { container } = renderWithIntl(<ServicePromises show={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("removing an entry from the config hides just that claim", () => {
    renderWithIntl(<ServicePromises claims={trustClaims.filter((c) => c.id !== "bestPrices")} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(en.promises.bestPrices.title)).toBeNull();
  });

  it("is not tied to the medicine sales flag", () => {
    renderWithIntl(<ServicePromises flags={parseFlags({ FLAG_MEDICINE_SALES: "false" })} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("uses decorative icons only, so text carries the meaning", () => {
    const { container } = renderWithIntl(<ServicePromises />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
