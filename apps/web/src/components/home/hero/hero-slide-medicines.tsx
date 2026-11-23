import { BadgeCheck, FileUp, Pill } from "lucide-react";
import { useTranslations } from "next-intl";
import { Bar, FloatingChip } from "./hero-art";
import { HeroSlide, type HeroSlideProps } from "./hero-slide";

/** Phone with a prescription upload and a medicine box. Only shown when medicine sales are on. */
function MedicinesVisual() {
  const t = useTranslations("hero.visual");
  return (
    <div className="relative h-[21rem] w-[27rem]">
      <div className="absolute top-0 left-10 w-48 rotate-[-4deg] rounded-[2rem] bg-ink p-2 shadow-2xl">
        <div className="flex h-72 flex-col gap-3 rounded-[1.5rem] bg-panel p-3">
          <Bar className="w-20 bg-ink/60" />
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/40 bg-tint-blue-soft">
            <FileUp className="size-8 text-brand-blue" />
            <Bar className="w-16 bg-line" />
          </div>
          <span className="rounded-md bg-brand-blue py-2 text-center text-[13px] font-semibold text-white">
            {t("upload")}
          </span>
        </div>
      </div>
      <div className="absolute right-6 bottom-6 w-44 rotate-3 rounded-xl bg-panel p-3 shadow-xl ring-1 ring-black/5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-tint-green">
          <Pill className="size-5 text-green-ink" />
        </span>
        <div className="mt-2 space-y-1.5">
          <Bar className="w-28 bg-ink/60" />
          <Bar className="w-20 bg-line" />
        </div>
        <span className="mt-2 inline-flex rounded-full bg-warning-bg px-2 py-0.5 text-[13px] font-semibold text-warning">
          {t("prescriptionNeeded")}
        </span>
      </div>
      <FloatingChip icon={BadgeCheck} label={t("licensedShop")} className="top-6 right-4" />
    </div>
  );
}

export function HeroSlideMedicines(props: HeroSlideProps) {
  return <HeroSlide {...props} icon={Pill} visual={<MedicinesVisual />} />;
}
