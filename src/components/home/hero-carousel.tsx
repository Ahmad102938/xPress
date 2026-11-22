import { ArrowRight, MapPin, Mic, PhoneOff, ShieldCheck, Store, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { BannerCarousel } from "@/components/ui/banner-carousel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";

type SlideKey = "verifiedDoctor" | "consultOnline" | "shops";

const slides: { key: SlideKey; href: string; icon: typeof ShieldCheck; flag?: keyof Flags }[] = [
  { key: "verifiedDoctor", href: "/doctors", icon: ShieldCheck },
  { key: "consultOnline", href: "/consult", icon: Video },
  { key: "shops", href: "/shops", icon: Store, flag: "shopNetwork" },
];

/* Decorative app previews (aria-hidden). Generic shapes only: no names, numbers or claims. */

function Line({ w, tone = "bg-line" }: { w: string; tone?: string }) {
  return <span className={`block h-2 rounded-full ${tone} ${w}`} />;
}

function DoctorMock() {
  const t = useTranslations("hero");
  const tBadge = useTranslations("badges");
  const tDoc = useTranslations("doctors");
  return (
    <div className="w-72 rotate-2 rounded-2xl bg-panel p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="size-12 rounded-full bg-tint-blue ring-4 ring-tint-green" />
        <div className="flex-1 space-y-2">
          <Line w="w-28" tone="bg-ink/70" />
          <Line w="w-20" />
        </div>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-tint-blue px-2 py-0.5 text-[11px] font-semibold text-deep-blue">
        <ShieldCheck className="size-3.5 text-brand-blue" />
        {tBadge("verified")}
      </span>
      <div className="mt-3 flex gap-1.5">
        <span className="rounded-full bg-tint-blue px-2 py-0.5 text-[11px] text-deep-blue">
          {tDoc("online")}
        </span>
        <span className="rounded-full bg-tint-green px-2 py-0.5 text-[11px] text-green-ink">
          {tDoc("atClinic")}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
        <div className="space-y-1.5">
          <span className="block text-[11px] text-muted">{t("mockSlot")}</span>
          <Line w="w-20" tone="bg-tint-green" />
        </div>
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
    <div className="relative">
      <div className="w-44 rounded-[1.75rem] bg-ink p-2 shadow-2xl">
        <div className="flex h-72 flex-col overflow-hidden rounded-[1.25rem] bg-tint-blue">
          <div className="flex items-center gap-1 bg-panel/80 px-3 py-2 text-[11px] font-semibold text-green-ink">
            <span className="size-2 rounded-full bg-green-accent" />
            {t("mockLive")}
          </div>
          <div className="flex flex-1 items-center justify-center">
            <span className="size-20 rounded-full bg-[#9DB8F5]" />
          </div>
          <div className="flex justify-center gap-3 bg-panel/80 py-3">
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
      <span className="absolute -right-10 bottom-16 w-28 space-y-1.5 rounded-xl bg-amber p-2.5 shadow-lg">
        <Line w="w-20" tone="bg-on-amber/40" />
        <Line w="w-14" tone="bg-on-amber/25" />
      </span>
    </div>
  );
}

function ShopsMock() {
  const t = useTranslations("hero");
  return (
    <div className="w-72 -rotate-1 overflow-hidden rounded-2xl bg-panel shadow-2xl">
      <div className="relative h-28 bg-[#EEF2F7]">
        <span className="absolute inset-x-0 top-10 h-3 bg-white" />
        <span className="absolute inset-y-0 left-24 w-3 bg-white" />
        <span className="absolute top-6 left-12 flex size-7 items-center justify-center rounded-full bg-brand-blue">
          <MapPin className="size-4 text-white" />
        </span>
        <span className="absolute top-12 right-14 flex size-7 items-center justify-center rounded-full bg-brand-green">
          <MapPin className="size-4 text-white" />
        </span>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 border-t border-line px-3 py-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-tint-green">
            <Store className="size-4 text-green-ink" />
          </span>
          <div className="flex-1 space-y-1.5">
            <Line w="w-24" tone="bg-ink/70" />
            <Line w="w-16" />
          </div>
          <span className="rounded-md bg-tint-blue px-2 py-1 text-[11px] font-semibold text-brand-blue">
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

export function HeroCarousel({ flags }: { flags: Flags }) {
  const t = useTranslations("hero");
  const visible = slides.filter((slide) => !slide.flag || flags[slide.flag]);

  return (
    <BannerCarousel label={t("label")}>
      {visible.map((slide) => {
        const Mock = mocks[slide.key];
        const Icon = slide.icon;
        return (
          // Gradients only inside banners (§25). Text sits on the deep/brand-blue part (≥ 5:1).
          <div
            key={slide.key}
            className="focus-light relative grid h-full min-h-64 items-center gap-6 overflow-hidden rounded-xl bg-hero px-5 py-7 text-white md:min-h-80 md:grid-cols-[1.25fr_1fr] md:bg-hero-wide md:px-12"
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
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild variant="amber" size="lg">
                  <Link href={slide.href}>
                    {t(`${slide.key}.cta`)}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
            <div aria-hidden="true" className="relative hidden justify-center md:flex">
              <Mock />
            </div>
          </div>
        );
      })}
    </BannerCarousel>
  );
}
