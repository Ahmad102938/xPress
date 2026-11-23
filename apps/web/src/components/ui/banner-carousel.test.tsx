import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/test/browser-mocks";
import { renderWithIntl } from "@/test/render";
import { BannerCarousel } from "./banner-carousel";

function renderCarousel() {
  return renderWithIntl(
    <BannerCarousel label="Highlights" autoAdvanceMs={7000} overlayControls>
      <button type="button">First</button>
      <button type="button">Second</button>
      <button type="button">Third</button>
    </BannerCarousel>,
  );
}

const current = () =>
  screen
    .getAllByRole("button", { name: /Go to slide/ })
    .findIndex((b) => b.getAttribute("aria-current") === "true") + 1;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BannerCarousel", () => {
  it("has labelled arrows, dots and a pause button", () => {
    mockMatchMedia(false);
    renderCarousel();
    expect(screen.getByRole("region", { name: "Highlights" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
    for (const n of [1, 2, 3]) {
      expect(screen.getByRole("button", { name: `Go to slide ${n}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Pause automatic slides" })).toBeInTheDocument();
    expect(screen.getAllByRole("group")[0]).toHaveAttribute("aria-label", "Slide 1 of 3");
  });

  it("advances about every 7 seconds", () => {
    mockMatchMedia(false);
    renderCarousel();
    expect(current()).toBe(1);
    act(() => vi.advanceTimersByTime(6900));
    expect(current()).toBe(1);
    act(() => vi.advanceTimersByTime(200));
    expect(current()).toBe(2);
  });

  it("pauses while hovered and while focus is inside", () => {
    mockMatchMedia(false);
    renderCarousel();
    const region = screen.getByRole("region", { name: "Highlights" });

    fireEvent.mouseEnter(region);
    act(() => vi.advanceTimersByTime(15000));
    expect(current()).toBe(1);
    fireEvent.mouseLeave(region);

    fireEvent.focus(screen.getByRole("button", { name: "Next slide" }));
    act(() => vi.advanceTimersByTime(15000));
    expect(current()).toBe(1);
  });

  it("stops with the pause button and resumes with play", () => {
    mockMatchMedia(false);
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: "Pause automatic slides" }));
    act(() => vi.advanceTimersByTime(15000));
    expect(current()).toBe(1);
    expect(screen.getByRole("button", { name: "Play automatic slides" })).toBeInTheDocument();
  });

  it("moves with the arrow keys and the arrow buttons, wrapping around", () => {
    mockMatchMedia(true);
    renderCarousel();
    const region = screen.getByRole("region", { name: "Highlights" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(current()).toBe(2);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(current()).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(current()).toBe(1);
  });

  it("never auto-advances when reduced motion is preferred (and hides pause)", () => {
    mockMatchMedia(true);
    renderCarousel();
    act(() => vi.advanceTimersByTime(30000));
    expect(current()).toBe(1);
    expect(screen.queryByRole("button", { name: "Pause automatic slides" })).toBeNull();
  });

  it("makes off-screen slides inert so Tab only reaches the visible slide", () => {
    mockMatchMedia(true);
    renderCarousel();
    const groups = screen.getAllByRole("group");
    expect(groups[0]).not.toHaveAttribute("inert");
    expect(groups[1]).toHaveAttribute("inert");
  });
});
