import { FileText, Lock, Mic, PhoneOff, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { BackBust, Bar, Bust, FloatingChip, SKIN } from "./hero-art";
import { HeroSlide, type HeroSlideProps } from "./hero-slide";

/** Over-the-shoulder view: a person at home on a video call with a doctor, plus a summary card. */
function OnlineVisual() {
  const t = useTranslations("hero.visual");
  return (
    <div className="relative h-[21rem] w-[27rem]">
      {/* Sofa and a plant: warm home context. */}
      <div className="absolute right-6 bottom-0 left-6 h-24 rounded-t-[2.5rem] bg-white/15" />
      <svg viewBox="0 0 60 90" className="absolute bottom-20 left-0 h-24" aria-hidden="true">
        <path d="M30 58C18 44 8 40 6 24c12 4 20 14 24 30z" fill="#22C55E" />
        <path d="M30 58c10-16 20-22 24-38-12 4-20 16-24 34z" fill="#15803D" />
        <path d="M30 58c-2-18 0-34 6-48 4 14 2 30-6 48z" fill="#22C55E" />
        <path d="M16 58h28l-4 30H20z" fill="#FFB703" />
      </svg>

      {/* Laptop with the call. */}
      <div className="absolute top-6 left-1/2 w-[19rem] -translate-x-[42%]">
        <div className="rounded-t-xl bg-ink p-2 shadow-2xl">
          <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-tint-blue">
            <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-panel/95 px-2 py-0.5 text-[13px] font-semibold text-green-ink">
              <span className="size-2 rounded-full bg-green-accent motion-safe:animate-pulse" />
              {t("videoCall")}
            </span>
            <Bust
              skin={SKIN.medium}
              top="#155DFC"
              hair="short"
              doctor
              className="absolute bottom-0 left-1/2 h-[82%] -translate-x-1/2"
            />
            <div className="absolute right-2 bottom-9 h-14 w-11 overflow-hidden rounded-md bg-tint-green ring-2 ring-white">
              <Bust skin={SKIN.light} top="#FFB703" hair="long" className="mt-1 size-11" />
            </div>
            <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-panel shadow">
                <Mic className="size-3.5 text-brand-blue" />
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-panel shadow">
                <Video className="size-3.5 text-brand-blue" />
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-error shadow">
                <PhoneOff className="size-3.5 text-white" />
              </span>
            </div>
          </div>
        </div>
        <div className="mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-xl bg-line shadow-lg" />
      </div>

      {/* Consultation summary card, tilted, top right. */}
      <div className="absolute top-0 -right-2 w-40 rotate-6 rounded-xl bg-panel p-3 shadow-xl ring-1 ring-black/5">
        <p className="flex items-center gap-1.5 text-[13px] leading-tight font-bold text-ink">
          <FileText className="size-4 shrink-0 text-brand-blue" />
          {t("summary")}
        </p>
        <div className="mt-2 space-y-1.5">
          <Bar className="w-full bg-line" />
          <Bar className="w-4/5 bg-line" />
          <Bar className="w-3/5 bg-line" />
        </div>
      </div>

      {/* The patient, seen from behind, in the foreground. */}
      <BackBust top="#0EA5A4" className="absolute -bottom-6 left-0 w-40 drop-shadow-xl" />

      <FloatingChip icon={Lock} label={t("notRecorded")} className="right-2 bottom-5" tone="blue" />
    </div>
  );
}

export function HeroSlideOnline(props: HeroSlideProps) {
  return <HeroSlide {...props} icon={Video} visual={<OnlineVisual />} />;
}
