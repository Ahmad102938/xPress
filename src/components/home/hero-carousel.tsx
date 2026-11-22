import Image from "next/image";
import { useTranslations } from "next-intl";
import { BannerCarousel } from "@/components/ui/banner-carousel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";

type SlideKey = "verifiedDoctor" | "consultOnline" | "shops";

const slides: { key: SlideKey; href: string; image: string; flag?: keyof Flags }[] = [
  { key: "verifiedDoctor", href: "/doctors", image: "/images/banner-doctor.svg" },
  { key: "consultOnline", href: "/consult", image: "/images/banner-consult.svg" },
  { key: "shops", href: "/shops", image: "/images/banner-shops.svg", flag: "shopNetwork" },
];

export function HeroCarousel({ flags }: { flags: Flags }) {
  const t = useTranslations("hero");
  const visible = slides.filter((slide) => !slide.flag || flags[slide.flag]);

  return (
    <BannerCarousel label={t("label")}>
      {visible.map((slide, i) => (
        // Gradients are allowed inside banners only (§25). Text sits on the blue end (contrast ≥ 5:1).
        <div
          key={slide.key}
          className="focus-light flex min-h-56 items-center gap-4 rounded-lg bg-banner-blue px-5 py-6 text-white md:min-h-64 md:px-10"
        >
          <div className="max-w-xl flex-1">
            <h2 className="text-2xl leading-tight font-bold text-white md:text-4xl">
              {t(`${slide.key}.title`)}
            </h2>
            <p className="mt-2 text-sm text-white md:text-base">{t(`${slide.key}.body`)}</p>
            <Button asChild variant="onDark" size="lg" className="mt-4">
              <Link href={slide.href}>{t(`${slide.key}.cta`)}</Link>
            </Button>
          </div>
          <Image
            src={slide.image}
            alt={t(`${slide.key}.imageAlt`)}
            width={240}
            height={200}
            // First slide is above the fold: load it eagerly with high priority (LCP).
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            className="hidden h-auto w-36 shrink-0 sm:block md:w-60"
          />
        </div>
      ))}
    </BannerCarousel>
  );
}
