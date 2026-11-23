import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import type { Flags } from "@acurexpress/core";
import { BannerCarousel } from "@/components/ui/banner-carousel";
import { type HeroSlideId, visibleHeroSlides } from "@/config/hero-slides";
import { HeroSlideAssistant } from "./hero-slide-assistant";
import { HeroSlideDoctors } from "./hero-slide-doctors";
import { HeroSlideMedicines } from "./hero-slide-medicines";
import { HeroSlideOnline } from "./hero-slide-online";
import { HeroSlideShops } from "./hero-slide-shops";
import type { HeroSlideProps } from "./hero-slide";

const SLIDES: Record<HeroSlideId, ComponentType<HeroSlideProps>> = {
  doctors: HeroSlideDoctors,
  online: HeroSlideOnline,
  shops: HeroSlideShops,
  medicines: HeroSlideMedicines,
  assistant: HeroSlideAssistant,
};

/** Home hero: one poster per visible slide (config/hero-slides.ts), about 7 s each. */
export function HeroCarousel({ flags }: { flags: Flags }) {
  const t = useTranslations("hero");
  const slides = visibleHeroSlides(flags);
  return (
    <BannerCarousel label={t("label")} autoAdvanceMs={7000} overlayControls>
      {slides.map((config, i) => {
        const Slide = SLIDES[config.id];
        return <Slide key={config.id} config={config} first={i === 0} />;
      })}
    </BannerCarousel>
  );
}
