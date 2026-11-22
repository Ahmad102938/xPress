import { Building2, Lock, MapPinned, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { TrustStat } from "@/components/brand/trust-stat";
import { trustStats, type TrustStatKey } from "@/lib/mock";

const tones: Record<TrustStatKey, "blue" | "green" | "amber" | "navy"> = {
  verifiedDoctors: "blue",
  partnerClinics: "green",
  pilotDistricts: "amber",
  privacy: "navy",
};

const icons: Record<TrustStatKey, LucideIcon> = {
  verifiedDoctors: ShieldCheck,
  partnerClinics: Building2,
  pilotDistricts: MapPinned,
  privacy: Lock,
};

export function TrustStrip() {
  const t = useTranslations("trust");
  const hasPlaceholders = trustStats.some((stat) => stat.isPlaceholder);

  return (
    <section aria-labelledby="trust-title" className="panel p-4">
      <h2 id="trust-title" className="sr-only">
        {t("label")}
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {trustStats.map((stat) => (
          <li key={stat.key}>
            <TrustStat
              icon={icons[stat.key]}
              tone={tones[stat.key]}
              value={stat.value}
              label={t(stat.key)}
              detail={stat.key === "privacy" ? t("privacyDetail") : undefined}
              isPlaceholder={stat.isPlaceholder}
            />
          </li>
        ))}
      </ul>
      {hasPlaceholders && <p className="mt-3 text-[13px] text-muted">{t("placeholderNote")}</p>}
    </section>
  );
}
