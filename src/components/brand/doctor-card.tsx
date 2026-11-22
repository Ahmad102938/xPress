import { CalendarClock } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { DoctorSummary } from "@/lib/mock/types";
import { formatInr } from "@/lib/utils";
import { ModeChips } from "./mode-chip";
import { DoctorBadge } from "./verification-badge";

function formatSlotTime(time: string, locale: string) {
  // Slots are stored as IST wall-clock times in the mock. Real data will be UTC timestamptz (§24 rule 9).
  const date = new Date(`2000-01-01T${time}:00+05:30`);
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function languageNames(codes: readonly string[], locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "language" });
  return codes.map((code) => names.of(code) ?? code);
}

export function DoctorCard({ doctor }: { doctor: DoctorSummary }) {
  const t = useTranslations("doctors");
  const tSpeciality = useTranslations("specialities.names");
  const locale = useLocale();
  const slot = formatSlotTime(doctor.nextSlot.time, locale);

  return (
    <article className="panel flex h-full flex-col gap-3 border border-line p-3">
      <div className="flex gap-3">
        <Image
          src="/images/doctor-placeholder.svg"
          alt={t("photoAlt", { name: doctor.name })}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <h3 className="truncate text-base leading-snug font-semibold">{doctor.name}</h3>
          <p className="text-sm text-body">{tSpeciality(doctor.speciality)}</p>
          <p className="text-[13px] text-muted">
            {t("experience", { years: doctor.experienceYears })}
          </p>
        </div>
      </div>

      <DoctorBadge type={doctor.badge} />
      <ModeChips modes={doctor.modes} />

      <p className="text-[13px] text-body">
        <span className="font-medium text-ink">{t("languages")}: </span>
        {languageNames(doctor.languages, locale).join(", ")}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
        <dl className="min-w-0 text-[13px]">
          <div>
            <dt className="text-muted">{t("fee")}</dt>
            <dd className="text-lg leading-tight font-bold text-ink">
              {formatInr(doctor.feeInr, locale)}
            </dd>
          </div>
          <div className="mt-1 text-body">
            <dt className="sr-only">{t("nextSlot")}</dt>
            <dd className="flex items-center gap-1">
              <CalendarClock aria-hidden="true" className="size-3.5 shrink-0 text-brand-green" />
              {t(doctor.nextSlot.day, { time: slot })}
            </dd>
          </div>
        </dl>
        <Button asChild variant="book">
          <Link
            href={{ pathname: "/login", query: { next: `/doctors/${doctor.id}` } }}
            aria-label={t("bookLabel", { name: doctor.name })}
          >
            {t("book")}
          </Link>
        </Button>
      </div>
    </article>
  );
}
