import { Bot, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";

/** Online consultation band. The e-prescription line shows only when online prescribing is on. */
export function ConsultPromo({ flags }: { flags: Flags }) {
  const t = useTranslations("promos.consult");
  return (
    <section
      aria-labelledby="consult-promo-title"
      className="focus-light flex flex-col gap-4 rounded-lg bg-banner-blue p-5 text-white md:flex-row md:items-center md:p-8"
      data-testid="consult-promo"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Video aria-hidden="true" className="size-6" />
      </span>
      <div className="flex-1">
        <h2 id="consult-promo-title" className="text-xl font-bold text-white">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-white">{t("body")}</p>
        {flags.onlinePrescribing && (
          <p className="mt-1 text-sm text-white" data-testid="prescription-note">
            {t("prescriptionNote")}
          </p>
        )}
      </div>
      <Button asChild variant="onDark" size="lg" className="w-fit">
        <Link href="/consult">{t("cta")}</Link>
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
      className="panel flex flex-col gap-4 border border-line p-5 md:flex-row md:items-center md:p-8"
      data-testid="ai-promo"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tint-blue">
        <Bot aria-hidden="true" className="size-6 text-brand-blue" />
      </span>
      <div className="flex-1">
        <h2 id="ai-promo-title" className="text-xl font-bold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-body">{t("body")}</p>
        {/* Persistent disclaimer required by Addendum A. */}
        <p className="mt-2 rounded-md bg-warning-bg p-2 text-[13px] text-warning">
          {t("disclaimer")}
        </p>
      </div>
      <Button asChild size="lg" className="w-fit">
        <Link href="/health-assistant">{t("cta")}</Link>
      </Button>
    </section>
  );
}
