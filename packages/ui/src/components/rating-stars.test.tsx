import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "../test/render";
import { RatingStars } from "./rating-stars";

describe("RatingStars", () => {
  it("states the rating in text for screen readers", () => {
    renderWithIntl(<RatingStars rating={4.25} count={12} />);
    expect(screen.getByText("Rated 4.3 out of 5")).toBeInTheDocument();
    expect(screen.getByText("(12 ratings)")).toBeInTheDocument();
  });

  it("clamps out-of-range values", () => {
    renderWithIntl(<RatingStars rating={9} />);
    expect(screen.getByText("Rated 5.0 out of 5")).toBeInTheDocument();
  });
});
