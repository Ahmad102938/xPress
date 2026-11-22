import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseFlags } from "@acurexpress/core";
import { renderWithIntl } from "@/test/render";
import { QuickActions } from "./quick-actions";

describe("QuickActions", () => {
  it("hides (does not grey out) medicines and the health assistant when flags are off", () => {
    renderWithIntl(<QuickActions flags={parseFlags({})} />);
    expect(screen.getByText("Book a clinic visit")).toBeInTheDocument();
    expect(screen.getByText("Nearby medical shops")).toBeInTheDocument();
    expect(screen.queryByText("Medicines")).toBeNull();
    expect(screen.queryByText("Health assistant")).toBeNull();
  });

  it("shows flagged tiles when their flags are on", () => {
    const flags = parseFlags({ FLAG_MEDICINE_SALES: "true", FLAG_AI_CONSULTANT: "true" });
    renderWithIntl(<QuickActions flags={flags} />);
    expect(screen.getByText("Medicines")).toBeInTheDocument();
    expect(screen.getByText("Health assistant")).toBeInTheDocument();
  });

  it("hides the shop tile when the shop network is off", () => {
    renderWithIntl(<QuickActions flags={parseFlags({ FLAG_SHOP_NETWORK: "false" })} />);
    expect(screen.queryByText("Nearby medical shops")).toBeNull();
  });
});
