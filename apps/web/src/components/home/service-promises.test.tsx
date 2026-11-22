import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ServicePromises } from "./service-promises";

describe("ServicePromises", () => {
  it("shows the four store promises with their sub-lines", () => {
    renderWithIntl(<ServicePromises />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Free Delivery")).toBeInTheDocument();
    expect(screen.getByText("On orders over ₹499")).toBeInTheDocument();
    expect(screen.getByText("24/7 Support")).toBeInTheDocument();
    expect(screen.getByText("Price match guarantee")).toBeInTheDocument();
  });

  it("uses decorative icons only, so text carries the meaning", () => {
    const { container } = renderWithIntl(<ServicePromises />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
