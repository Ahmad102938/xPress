import { MapPin, Stethoscope } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button, RatingStars } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import type { ClinicSummary } from "@/lib/mock/types";
import { ModeChips } from "./mode-chip";

export function ClinicCard({ clinic }: { clinic: ClinicSummary }) {
  const t = useTranslations("clinics");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-panel transition hover:border-brand-green hover:shadow-md">
      <Image
        src="/images/clinic-placeholder.svg"
        alt={t("photoAlt", { name: clinic.name })}
        width={320}
        height={180}
        className="aspect-video h-auto w-full"
      />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 id={`${clinic.id}-name`} className="text-base leading-snug font-semibold">
          {clinic.name}
        </h3>
        <p className="flex items-center gap-1 text-sm text-body">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted" />
          {clinic.area}
        </p>
        <p className="flex items-center gap-1 text-sm text-body">
          <Stethoscope aria-hidden="true" className="size-4 shrink-0 text-muted" />
          {t("doctors", { count: clinic.doctorsCount })}
        </p>
        <RatingStars rating={clinic.rating} count={clinic.ratingCount} />
        <ModeChips modes={clinic.modes} />
        <Button asChild variant="book" className="mt-auto w-full">
          <Link href="/clinics" aria-describedby={`${clinic.id}-name`}>
            {t("book")}
          </Link>
        </Button>
      </div>
    </article>
  );
}
