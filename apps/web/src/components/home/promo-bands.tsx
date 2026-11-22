import { ArrowRight, Bot, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@acurexpress/core";

/** Online consultation strip. The e-prescription line shows only when online prescribing is on. */
export function ConsultPromo({ flags }: { flags: Flags }) {
  const t = useTranslations("promos.consult");
  return (
    <section
      aria-labelledby="consult-promo-title"
      className="focus-light relative flex flex-col gap-4 overflow-hidden rounded-xl bg-banner-navy p-5 text-white md:flex-row md:items-center md:p-7"
      data-testid="consult-promo"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full bg-white/10"
      />
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-amber text-on-amber shadow-lg">
        <Video aria-hidden="true" className="size-7" />
      </span>
      <div className="relative flex-1">
        <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[13px] font-semibold text-white">
          {t("badge")}
        </span>
        <h2
          id="consult-promo-title"
          className="mt-1.5 text-xl font-extrabold text-white md:text-2xl"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-white">{t("body")}</p>
        {flags.onlinePrescribing && (
          <p className="mt-1 text-sm text-white" data-testid="prescription-note">
            {t("prescriptionNote")}
          </p>
        )}
      </div>
      <Button asChild variant="amber" size="lg" className="relative w-fit">
        <Link href="/consult">
          {t("cta")}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/** AI Health Consultant band (Addendum A). Rendered only when flags.aiConsultant is on. */
export function AiPromo() {
  const t = useTranslations("promos.ai");
  return (
    <section
      aria-labelledby="ai-promo-title"
      className="focus-light flex flex-col gap-4 rounded-xl bg-hero p-5 text-white md:flex-row md:items-center md:bg-hero-wide md:p-8"
      data-testid="ai-promo"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Bot aria-hidden="true" className="size-7" />
      </span>
      <div className="flex-1">
        <h2 id="ai-promo-title" className="text-xl font-extrabold text-white md:text-2xl">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-white">{t("body")}</p>
        {/* Persistent disclaimer required by Addendum A. */}
        <p className="mt-2 rounded-md bg-warning-bg p-2 text-[13px] text-warning">
          {t("disclaimer")}
        </p>
      </div>
      <Button asChild variant="amber" size="lg" className="w-fit">
        <Link href="/health-assistant">{t("cta")}</Link>
      </Button>
    </section>
  );
}
