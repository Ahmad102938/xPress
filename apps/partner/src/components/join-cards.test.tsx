import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { JoinCards } from "./join-cards";

describe("JoinCards", () => {
  it("shows the three partner types, each marked as coming soon", () => {
    renderWithIntl(<JoinCards />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    for (const name of ["Doctors", "Clinics", "Medical shops"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
  });
});
