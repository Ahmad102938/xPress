import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseFlags } from "@acurexpress/core";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import { mockMatchMedia } from "@/test/browser-mocks";
import { renderWithIntl } from "@/test/render";
import { HeroCarousel } from "./hero-carousel";

beforeEach(() => mockMatchMedia(true));
afterEach(() => vi.unstubAllGlobals());

const titles = () =>
  screen
    .getAllByRole("group")
    .map((slide) => within(slide).getByRole("heading", { level: 2 }).textContent);

describe("HeroCarousel", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["hi", hi],
  ] as const) {
    it(`${locale}: default flags show the doctors, online and shops slides, each complete`, () => {
      renderWithIntl(<HeroCarousel flags={parseFlags({})} />, { locale });
      const s = messages.hero.slides;
      expect(titles()).toEqual([s.doctors.title, s.online.title, s.shops.title]);
      for (const id of ["doctors", "online", "shops"] as const) {
        const slide = document.querySelector(`[data-hero-slide="${id}"]`) as HTMLElement;
        expect(within(slide).getAllByText(s[id].eyebrow).length).toBeGreaterThanOrEqual(1);
        expect(within(slide).getByText(s[id].body)).toBeInTheDocument();
        expect(
          within(slide).getByRole("link", { name: new RegExp(s[id].cta) }),
        ).toBeInTheDocument();
        // The illustration is hidden from assistive tech and described in text instead.
        expect(within(slide).getByText(s[id].visualAlt)).toHaveClass("sr-only");
      }
    });
  }

  it("CTAs lead to the right pages", () => {
    renderWithIntl(<HeroCarousel flags={parseFlags({})} />);
    expect(screen.getByRole("link", { name: /Find a doctor/ })).toHaveAttribute("href", "/doctors");
    expect(screen.getByRole("link", { name: /Consult online/ })).toHaveAttribute(
      "href",
      "/consult",
    );
    expect(screen.getByRole("link", { name: /Find shops/ })).toHaveAttribute("href", "/shops");
  });

  it("shop network off hides the shops slide", () => {
    renderWithIntl(<HeroCarousel flags={parseFlags({ FLAG_SHOP_NETWORK: "false" })} />);
    expect(titles()).toEqual([en.hero.slides.doctors.title, en.hero.slides.online.title]);
  });

  it("medicines and assistant slides appear only when their flags are on", () => {
    const { unmount } = renderWithIntl(<HeroCarousel flags={parseFlags({})} />);
    expect(screen.queryByText(en.hero.slides.medicines.title)).toBeNull();
    expect(screen.queryByText(en.hero.slides.assistant.title)).toBeNull();
    unmount();

    renderWithIntl(
      <HeroCarousel
        flags={parseFlags({ FLAG_MEDICINE_SALES: "true", FLAG_AI_CONSULTANT: "true" })}
      />,
    );
    expect(titles()).toHaveLength(5);
    expect(screen.getByText(en.hero.slides.medicines.title)).toBeInTheDocument();
    expect(screen.getByText(en.hero.slides.assistant.title)).toBeInTheDocument();
    // The assistant slide always carries its "not a diagnosis" note.
    expect(screen.getByText(en.hero.visual.aiNote)).toBeInTheDocument();
  });

  it("posters show generic UI only: both badge wordings, no names or ratings", () => {
    const { container } = renderWithIntl(<HeroCarousel flags={parseFlags({})} />);
    const doctors = container.querySelector('[data-hero-slide="doctors"]') as HTMLElement;
    expect(within(doctors).getByText("A-CureXpress Verified")).toBeInTheDocument();
    expect(within(doctors).getByText("Registered Doctor")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Dr\.|★|\d\.\d|reviews?|ratings?/i);
  });
});
