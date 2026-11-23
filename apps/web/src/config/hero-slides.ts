import type { FlagName, Flags } from "@acurexpress/core";

/**
 * Home hero slides: copy keys, link, accent and an optional real photo, in one typed place.
 * Copy lives in messages under `hero.slides.<id>` (eyebrow, title, body, cta, p1, p2, visualAlt).
 * Flagged slides are hidden (not greyed out) while their flag is off.
 *
 * To replace an illustration with a real photo later, set `image` (a file in /public) and its
 * `visualAlt` message describes it. No code change is needed. Photos must show real, consenting
 * people or none at all, and no fake doctors (hard rule 7).
 */
export type HeroSlideId = "doctors" | "online" | "shops" | "medicines" | "assistant";

export interface HeroSlideConfig {
  id: HeroSlideId;
  href: string;
  /** Gradient utility in styles/globals.css: hero-accent-<accent>. */
  accent: HeroSlideId;
  flag?: FlagName;
  image?: { src: string; width: number; height: number };
}

export const heroSlides: readonly HeroSlideConfig[] = [
  { id: "doctors", href: "/doctors", accent: "doctors" },
  { id: "online", href: "/consult", accent: "online" },
  { id: "shops", href: "/shops", accent: "shops", flag: "shopNetwork" },
  { id: "medicines", href: "/medicines", accent: "medicines", flag: "medicineSales" },
  { id: "assistant", href: "/health-assistant", accent: "assistant", flag: "aiConsultant" },
];

export function visibleHeroSlides(flags: Flags, slides = heroSlides): HeroSlideConfig[] {
  return slides.filter((slide) => !slide.flag || flags[slide.flag]);
}
