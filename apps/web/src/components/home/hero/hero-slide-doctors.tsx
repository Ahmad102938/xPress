import { Building2, IndianRupee, Stethoscope, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { RegisteredBadge, VerifiedBadge } from "@acurexpress/ui";
import { Bar, Bust, SKIN } from "./hero-art";
import { HeroSlide, type HeroSlideProps } from "./hero-slide";

const SLOTS = ["10:00", "11:30", "16:30"];

/** Mode chips match the rest of the page: clinic = building + green, online = video + blue. */
function ModeChips() {
  const t = useTranslations("doctors");
  return (
    <div className="flex gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-tint-green px-2 py-0.5 text-[13px] font-semibold text-green-ink">
        <Building2 className="size-3.5" />
        {t("atClinic")}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-tint-blue px-2 py-0.5 text-[13px] font-semibold text-deep-blue">
        <Video className="size-3.5" />
        {t("online")}
      </span>
    </div>
  );
}

/** Two stacked profile cards (Registered behind, Verified in front) in a browser frame. */
function DoctorsVisual() {
  const t = useTranslations("hero.visual");
  const tDoc = useTranslations("doctors");
  const tSpec = useTranslations("specialities.names");
  return (
    <div className="relative h-[21rem] w-[27rem]">
      {/* Back card: a Registered Doctor profile (plain grey outline label, no shield). */}
      <div className="absolute top-16 -left-2 w-52 -rotate-6 rounded-2xl bg-panel p-3.5 shadow-xl ring-1 ring-black/5">
        <div className="flex items-center gap-2.5">
          <Bust
            skin={SKIN.deep}
            top="#0EA5A4"
            hair="short"
            doctor
            bg="#E7F6EC"
            className="size-11"
          />
          <div className="flex-1 space-y-1.5">
            <Bar className="w-24 bg-ink/60" />
            <Bar className="w-16 bg-line" />
          </div>
        </div>
        <RegisteredBadge className="mt-3" />
      </div>

      {/* Front card: browser frame with an A-CureXpress Verified profile. */}
      <div className="absolute top-0 -right-2 w-[18.25rem] overflow-hidden rounded-2xl bg-panel shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-1.5 border-b border-line bg-page px-3 py-2">
          <span className="size-2 rounded-full bg-error/70" />
          <span className="size-2 rounded-full bg-amber" />
          <span className="size-2 rounded-full bg-green-accent" />
          <span className="ml-2 h-3 flex-1 rounded-full bg-panel ring-1 ring-line" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Bust
              skin={SKIN.light}
              top="#155DFC"
              hair="bun"
              doctor
              bg="#EAF1FF"
              className="size-14 shrink-0 rounded-full ring-2 ring-tint-green ring-offset-2"
            />
            <div className="min-w-0">
              <Bar className="w-28 bg-ink/70" />
              <p className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-body">
                <Stethoscope className="size-3.5 text-brand-blue" />
                {tSpec("general-physician")}
              </p>
            </div>
          </div>
          <VerifiedBadge className="mt-3" />
          <div className="mt-3">
            <ModeChips />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-muted">{t("slots")}</p>
          <div className="mt-1.5 flex gap-1.5">
            {SLOTS.map((slot, i) => (
              <span
                key={slot}
                className={`rounded-md px-2.5 py-1 text-[13px] font-semibold ${
                  i === 1
                    ? "bg-brand-blue text-white shadow-sm"
                    : "bg-tint-blue-soft text-deep-blue ring-1 ring-tint-blue"
                }`}
              >
                {slot}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-body">
              <IndianRupee className="size-3.5 shrink-0 text-brand-green" />
              {t("feeShown")}
            </span>
            <span className="rounded-md bg-brand-green px-4 py-1.5 text-[13px] font-semibold text-white">
              {tDoc("book")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSlideDoctors(props: HeroSlideProps) {
  return <HeroSlide {...props} icon={Stethoscope} visual={<DoctorsVisual />} />;
}
