import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@acurexpress/ui";
import type { HeroSlideConfig, HeroSlideId } from "@/config/hero-slides";
import { Link } from "@/i18n/navigation";
import { HeroBackdrop } from "./hero-art";

/** Full class strings so Tailwind generates them (see styles/globals.css). */
const ACCENTS: Record<HeroSlideId, string> = {
  doctors: "hero-accent-doctors",
  online: "hero-accent-online",
  shops: "hero-accent-shops",
  medicines: "hero-accent-medicines",
  assistant: "hero-accent-assistant",
};

export interface HeroSlideProps {
  config: HeroSlideConfig;
  /** First visible slide: its photo (if configured) is loaded with high priority for LCP. */
  first?: boolean;
}

/**
 * Shared poster layout. Mobile: stacked (eyebrow, two-line headline, one sentence, two benefit
 * chips, CTA, then the visual cropped at the bottom). Desktop: text left, visual right, two
 * bullets; carousel controls overlay the bottom-left (md:pb-16 keeps room for them).
 */
export function HeroSlide({
  config,
  first = false,
  icon: Icon,
  visual,
}: HeroSlideProps & { icon: LucideIcon; visual: ReactNode }) {
  const t = useTranslations(`hero.slides.${config.id}`);

  return (
    <div
      data-hero-slide={config.id}
      className={`focus-light relative isolate grid h-[27.5rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl text-white md:h-[24.5rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:grid-rows-1 md:[--hero-angle:100deg] ${ACCENTS[config.accent]}`}
    >
      <HeroBackdrop />
      <div className="relative z-10 flex flex-col items-start px-5 pt-5 md:justify-center md:px-12 md:pt-2 md:pb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white ring-1 ring-white/25">
          <Icon aria-hidden="true" className="size-4" />
          {t("eyebrow")}
        </span>
        <h2 className="mt-3 max-w-[16ch] text-[1.625rem] leading-[1.15] font-extrabold tracking-tight text-balance text-white md:max-w-[15ch] md:text-[2.5rem] md:leading-[1.1]">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-md text-[15px] leading-snug text-pretty text-white md:mt-3 md:text-base">
          {t("body")}
        </p>
        {/* Two benefits: bullets on desktop, chips on mobile. */}
        <ul className="mt-3 hidden flex-col gap-1.5 md:flex">
          {(["p1", "p2"] as const).map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-white">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-amber" />
              {t(point)}
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-1.5 md:hidden">
          {(["p1", "p2"] as const).map((point) => (
            <li
              key={point}
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-[13px] font-semibold text-white ring-1 ring-white/25"
            >
              {t(point)}
            </li>
          ))}
        </ul>
        <Button asChild variant="amber" size="lg" className="mt-4 md:mt-5">
          <Link href={config.href}>
            {t("cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="relative flex min-h-0 justify-center overflow-hidden md:items-center md:overflow-visible">
        {config.image ? (
          <Image
            src={config.image.src}
            width={config.image.width}
            height={config.image.height}
            alt={t("visualAlt")}
            loading={first ? "eager" : "lazy"}
            fetchPriority={first ? "high" : "auto"}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <p className="sr-only">{t("visualAlt")}</p>
            <div
              aria-hidden="true"
              className="mt-4 origin-top scale-[0.74] sm:scale-[0.86] md:mt-0 md:origin-center md:scale-[0.9] lg:scale-100"
            >
              {visual}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
