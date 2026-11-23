import { BadgeCheck, Clock, Navigation, Phone, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { FloatingChip } from "./hero-art";
import { HeroSlide, type HeroSlideProps } from "./hero-slide";

function ShopPin({
  label,
  className,
  selected,
}: {
  label: string;
  className: string;
  selected?: boolean;
}) {
  return (
    <span className={`absolute flex flex-col items-center ${className}`}>
      <span className="mb-1 rounded-full bg-panel px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap text-green-ink shadow">
        {label}
      </span>
      <span
        className={`flex items-center justify-center rounded-full rounded-br-none bg-brand-green shadow-md ring-2 ring-white ${
          selected ? "size-9 rotate-45" : "size-7 rotate-45"
        }`}
      >
        <Store className={`-rotate-45 text-white ${selected ? "size-4" : "size-3.5"}`} />
      </span>
    </span>
  );
}

/** Tilted map with shop pins and "You are here", plus a shop sheet with Open now, Call, Directions. */
function ShopsVisual() {
  const t = useTranslations("hero.visual");
  return (
    <div className="relative h-[21rem] w-[27rem]">
      <div className="absolute top-2 left-4 h-[14.5rem] w-[22rem] [transform:perspective(900px)_rotateX(14deg)_rotateZ(-6deg)] overflow-hidden rounded-2xl bg-page shadow-2xl ring-4 ring-white/60">
        <svg viewBox="0 0 352 232" className="absolute inset-0 size-full" aria-hidden="true">
          <rect width="352" height="232" fill="#F1F5F9" />
          <path d="M0 150c60-10 90 30 150 20s90-60 202-40v102H0z" fill="#E7F6EC" />
          <path
            d="M250 0c-10 40 20 60 10 100s-50 60-40 132"
            fill="none"
            stroke="#EAF1FF"
            strokeWidth="18"
          />
          <path
            d="M0 70h352M0 168h352M90 0v232M210 0v232M300 0v232"
            stroke="#FFFFFF"
            strokeWidth="10"
          />
          <path
            d="M0 120c80 0 120-50 200-50s110 40 152 40"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="14"
          />
          <path d="M30 20h40v36H30zM110 90h60v60h-60zM230 180h50v40h-50z" fill="#E2E8F0" />
        </svg>
        <ShopPin label={t("medicalShop")} className="top-6 left-6" />
        <ShopPin label={t("medicalShop")} className="top-20 right-6" selected />
        <span className="absolute bottom-10 left-28 flex flex-col items-center">
          <span className="relative flex size-5 items-center justify-center">
            <span className="absolute size-5 rounded-full bg-brand-blue/30 motion-safe:animate-ping" />
            <span className="size-4 rounded-full border-[3px] border-white bg-brand-blue shadow" />
          </span>
          <span className="mt-1 rounded-full bg-brand-blue px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap text-white shadow">
            {t("youAreHere")}
          </span>
        </span>
      </div>

      {/* Bottom sheet for the selected shop. */}
      <div className="absolute right-0 bottom-0 w-64 rounded-2xl bg-panel p-3.5 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-tint-green">
            <Store className="size-5 text-green-ink" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink">{t("medicalShop")}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-tint-green px-2 py-0.5 text-[13px] font-semibold text-green-ink">
              <Clock className="size-3.5" />
              {t("openNow")}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="inline-flex items-center justify-center gap-1 rounded-md border border-brand-blue py-1.5 text-[13px] font-semibold text-brand-blue">
            <Phone className="size-3.5" />
            {t("call")}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-brand-blue py-1.5 text-[13px] font-semibold text-white">
            <Navigation className="size-3.5" />
            {t("directions")}
          </span>
        </div>
      </div>

      <FloatingChip icon={BadgeCheck} label={t("checkedAddress")} className="bottom-20 left-0" />
    </div>
  );
}

export function HeroSlideShops(props: HeroSlideProps) {
  return <HeroSlide {...props} icon={Store} visual={<ShopsVisual />} />;
}
