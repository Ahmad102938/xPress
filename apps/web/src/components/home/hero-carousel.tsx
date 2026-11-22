import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Languages,
  Lock,
  MapPin,
  Mic,
  Navigation,
  PhoneOff,
  ShieldCheck,
  Store,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BannerCarousel } from "@/components/ui/banner-carousel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@acurexpress/core";

type SlideKey = "verifiedDoctor" | "consultOnline" | "shops";

interface Slide {
  key: SlideKey;
  href: string;
  icon: LucideIcon;
  /** Icons for the two floating chips around the preview. */
  chipIcons: [LucideIcon, LucideIcon];
  flag?: keyof Flags;
}

const slides: Slide[] = [
  {
    key: "verifiedDoctor",
    href: "/doctors",
    icon: ShieldCheck,
    chipIcons: [CalendarCheck, Languages],
  },
  { key: "consultOnline", href: "/consult", icon: Video, chipIcons: [Lock, Clock] },
  {
    key: "shops",
    href: "/shops",
    icon: Store,
    chipIcons: [Clock, Navigation],
    flag: "shopNetwork",
  },
];

/*
 * Decorative app previews (aria-hidden). They show what the product does with generic shapes and
 * labels only: no names, prices, counts or claims (hard rule 7). The real information for screen
 * readers is in the slide text.
 */

function Line({ w, tone = "bg-line" }: { w: string; tone?: string }) {
  return <span className={`block h-2 rounded-full ${tone} ${w}`} />;
}

const SAMPLE_TIMES = ["10:00", "11:30", "16:30"];

function DoctorMock() {
  const t = useTranslations("hero");
  const tBadge = useTranslations("badges");
  const tDoc = useTranslations("doctors");
  return (
    <div className="w-80 rounded-2xl bg-panel p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="size-12 rounded-full bg-tint-blue ring-4 ring-tint-green" />
        <div className="flex-1 space-y-2">
          <Line w="w-32" tone="bg-ink/70" />
          <Line w="w-20" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-tint-blue px-2 py-0.5 text-[11px] font-semibold text-deep-blue">
          <ShieldCheck className="size-3.5 text-brand-blue" />
          {tBadge("verified")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-tint-blue px-2 py-0.5 text-[11px] text-deep-blue">
          <Video className="size-3" />
          {tDoc("online")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-tint-green px-2 py-0.5 text-[11px] text-green-ink">
          <MapPin className="size-3" />
          {tDoc("atClinic")}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-muted">{t("mockSlots")}</p>
      <div className="mt-1.5 flex gap-1.5">
        {SAMPLE_TIMES.map((time, i) => (
          <span
            key={time}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
              i === 1
                ? "bg-brand-blue text-white"
                : "bg-tint-blue-soft text-deep-blue ring-1 ring-tint-blue"
            }`}
          >
            {time}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-body">
          <IndianRupee className="size-3.5 text-brand-green" />
          {t("mockFeeShown")}
        </span>
        <span className="rounded-md bg-brand-green px-4 py-1.5 text-xs font-semibold text-white">
          {tDoc("book")}
        </span>
      </div>
    </div>
  );
}

function ConsultMock() {
  const t = useTranslations("hero");
  return (
    <div className="w-48 rounded-[1.75rem] bg-ink p-2 shadow-2xl">
      <div className="flex h-76 flex-col overflow-hidden rounded-[1.25rem] bg-tint-blue">
        <div className="flex items-center gap-1.5 bg-panel px-3 py-2 text-[11px] font-semibold text-green-ink">
          <span className="size-2 animate-pulse rounded-full bg-green-accent" />
          {t("mockCall")}
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          <span className="size-20 rounded-full bg-[#9DB8F5] ring-8 ring-white/60" />
          <span className="absolute right-2 bottom-2 h-14 w-11 rounded-lg bg-deep-blue/80 ring-2 ring-white" />
        </div>
        <div className="flex justify-center gap-3 bg-panel py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-tint-blue">
            <Mic className="size-4 text-brand-blue" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-tint-blue">
            <Video className="size-4 text-brand-blue" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-error">
            <PhoneOff className="size-4 text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}

function ShopsMock() {
  const t = useTranslations("hero");
  return (
    <div className="w-80 overflow-hidden rounded-2xl bg-panel shadow-2xl">
      <div className="relative h-28 bg-[#EEF2F7]">
        <span className="absolute inset-x-0 top-10 h-3 bg-white" />
        <span className="absolute inset-y-0 left-24 w-3 bg-white" />
        <span className="absolute inset-y-0 right-20 w-2 bg-white" />
        <span className="absolute top-5 left-12 flex size-7 items-center justify-center rounded-full bg-brand-blue shadow">
          <MapPin className="size-4 text-white" />
        </span>
        <span className="absolute top-14 right-10 flex size-7 items-center justify-center rounded-full bg-brand-green shadow">
          <MapPin className="size-4 text-white" />
        </span>
        <span className="absolute bottom-3 left-36 size-4 rounded-full border-4 border-white bg-brand-blue shadow" />
      </div>
      <p className="px-3 pt-2.5 text-[11px] font-semibold text-muted">{t("mockNearby")}</p>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-tint-green">
            <Store className="size-4 text-green-ink" />
          </span>
          <div className="flex-1 space-y-1.5">
            <Line w="w-24" tone="bg-ink/70" />
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-brand-green" />
              <Line w="w-14" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-tint-blue px-2 py-1 text-[11px] font-semibold text-brand-blue">
            <Navigation className="size-3" />
            {t("mockDirections")}
          </span>
        </div>
      ))}
    </div>
  );
}

const mocks: Record<SlideKey, () => React.ReactElement> = {
  verifiedDoctor: DoctorMock,
  consultOnline: ConsultMock,
  shops: ShopsMock,
};

function FloatingChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <span
      className={`absolute z-10 inline-flex items-center gap-1.5 rounded-full bg-panel px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-ink shadow-lg ${className}`}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-tint-green">
        <Icon className="size-3 text-green-ink" />
      </span>
      {label}
    </span>
  );
}

export function HeroCarousel({ flags }: { flags: Flags }) {
  const t = useTranslations("hero");
  const visible = slides.filter((slide) => !slide.flag || flags[slide.flag]);

  return (
    <BannerCarousel label={t("label")}>
      {visible.map((slide) => {
        const Mock = mocks[slide.key];
        const Icon = slide.icon;
        const [ChipA, ChipB] = slide.chipIcons;
        return (
          // Gradients only inside banners (§25). Text sits on the deep/brand-blue part (≥ 5:1).
          <div
            key={slide.key}
            className="focus-light relative grid h-full min-h-64 items-center gap-6 overflow-hidden rounded-xl bg-hero px-5 py-7 text-white md:min-h-88 md:grid-cols-[1.2fr_1fr] md:bg-hero-wide md:px-12"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-white/10"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-white/5"
            />
            <div className="relative max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white ring-1 ring-white/25">
                <Icon aria-hidden="true" className="size-4" />
                {t(`${slide.key}.badge`)}
              </span>
              <h2 className="mt-3 text-[1.75rem] leading-tight font-extrabold tracking-tight text-white md:text-[2.5rem]">
                {t(`${slide.key}.title`)}
              </h2>
              <p className="mt-2 text-[15px] text-white md:text-base">{t(`${slide.key}.body`)}</p>
              <ul className="mt-3 space-y-1.5">
                {(["p1", "p2", "p3"] as const).map((point, i) => (
                  <li
                    key={point}
                    className={`items-start gap-2 text-sm text-white ${i === 2 ? "hidden sm:flex" : "flex"}`}
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-amber"
                    />
                    {t(`${slide.key}.points.${point}`)}
                  </li>
                ))}
              </ul>
              <Button asChild variant="amber" size="lg" className="mt-5">
                <Link href={slide.href}>
                  {t(`${slide.key}.cta`)}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div aria-hidden="true" className="relative hidden justify-center py-6 md:flex">
              <div className="relative">
                <Mock />
                <FloatingChip
                  icon={ChipA}
                  label={t(`${slide.key}.chips.c1`)}
                  className="-top-4 -left-10"
                />
                <FloatingChip
                  icon={ChipB}
                  label={t(`${slide.key}.chips.c2`)}
                  className="-right-8 -bottom-4"
                />
              </div>
            </div>
          </div>
        );
      })}
    </BannerCarousel>
  );
}
