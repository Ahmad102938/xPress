import { CreditCard, FileCheck2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { RegisteredBadge, VerifiedBadge } from "@/components/brand/verification-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function WhyTrust() {
  const t = useTranslations("whyTrust");
  const points = [
    { key: "licences", icon: FileCheck2 },
    { key: "privacy", icon: Lock },
    { key: "payments", icon: CreditCard },
  ] as const;

  return (
    <section aria-labelledby="trust-why-title" className="panel p-4 md:p-6">
      <h2 id="trust-why-title" className="mb-4 text-lg font-bold md:text-xl">
        {t("title")}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-line p-3">
          <VerifiedBadge />
          <h3 className="mt-2 text-base font-semibold">{t("verifiedTitle")}</h3>
          <p className="text-sm text-body">{t("verifiedBody")}</p>
        </div>
        <div className="rounded-lg border border-line p-3">
          <RegisteredBadge />
          <h3 className="mt-2 text-base font-semibold">{t("registeredTitle")}</h3>
          <p className="text-sm text-body">{t("registeredBody")}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {points.map(({ key, icon: Icon }) => (
          <li key={key} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-green">
              <Icon aria-hidden="true" className="size-5 text-brand-green" />
            </span>
            <div>
              <h3 className="text-base font-semibold">{t(`${key}Title`)}</h3>
              <p className="text-sm text-body">{t(`${key}Body`)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-muted">{t("scopeNote")}</p>
      <Button asChild variant="outline" className="mt-3">
        <Link href="/trust">{t("cta")}</Link>
      </Button>
    </section>
  );
}
