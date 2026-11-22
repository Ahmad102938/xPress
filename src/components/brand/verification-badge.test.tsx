import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { DoctorBadge, RegisteredBadge, VerifiedBadge } from "./verification-badge";

describe("verification badges", () => {
  it("Verified shows text and a shield icon, never colour alone", () => {
    const { container } = renderWithIntl(<VerifiedBadge />);
    expect(screen.getByText("A-CureXpress Verified")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("Registered shows plain text and no icon, so it cannot be mistaken for Verified", () => {
    const { container } = renderWithIntl(<RegisteredBadge />);
    expect(screen.getByText("Registered Doctor")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("DoctorBadge picks the badge from the type", () => {
    renderWithIntl(<DoctorBadge type="registered" />);
    expect(screen.queryByText("A-CureXpress Verified")).toBeNull();
    expect(screen.getByText("Registered Doctor")).toBeInTheDocument();
  });
});
