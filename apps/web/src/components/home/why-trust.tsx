import { Check, CreditCard, FileCheck2, Lock, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { RegisteredBadge, VerifiedBadge } from "@/components/brand/verification-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Dark navy trust band (reference design). White text on navy is > 12:1. */
export function WhyTrust() {
  const t = useTranslations("whyTrust");
  const points = [
    { key: "licences", icon: FileCheck2, tone: "bg-brand-green" },
    { key: "privacy", icon: Lock, tone: "bg-brand-blue" },
    { key: "payments", icon: CreditCard, tone: "bg-amber text-on-amber" },
  ] as const;

  return (
    <section
      aria-labelledby="trust-why-title"
      className="focus-light rounded-xl bg-navy p-5 text-white md:p-8"
    >
      <h2
        id="trust-why-title"
        className="flex items-center gap-2 text-xl font-extrabold text-white md:text-2xl"
      >
        <ShieldCheck aria-hidden="true" className="size-6 text-green-accent" />
        {t("title")}
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/15">
          <VerifiedBadge />
          <h3 className="mt-3 text-base font-bold text-white">{t("verifiedTitle")}</h3>
          <p className="mt-1 text-sm text-white/85">{t("verifiedBody")}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-4 ring-1 ring-white/15">
          <RegisteredBadge />
          <h3 className="mt-3 text-base font-bold text-white">{t("registeredTitle")}</h3>
          <p className="mt-1 text-sm text-white/85">{t("registeredBody")}</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {points.map(({ key, icon: Icon, tone }) => (
          <li key={key} className="flex gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white ${tone}`}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">{t(`${key}Title`)}</h3>
              <p className="text-sm text-white/85">{t(`${key}Body`)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-start gap-1.5 text-[13px] text-white/80">
        <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-green-accent" />
        {t("scopeNote")}
      </p>
      <Button asChild variant="onDark" className="mt-4">
        <Link href="/trust">{t("cta")}</Link>
      </Button>
    </section>
  );
}
