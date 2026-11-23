import { CreditCard, LockKeyhole, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Commitments in one slim line: icon plus text (never colour alone), no numbers or guarantees. */
export function TrustStrip({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  const t = useTranslations("footer.trust");
  const items: { key: "reviewed" | "privacy" | "payments"; icon: LucideIcon }[] = [
    { key: "reviewed", icon: ShieldCheck },
    { key: "privacy", icon: LockKeyhole },
    ...(paymentsEnabled ? [{ key: "payments" as const, icon: CreditCard }] : []),
  ];

  return (
    <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-6">
      <ul
        aria-label={t("label")}
        className="flex flex-col gap-1 md:flex-row md:flex-wrap md:gap-x-6"
      >
        {items.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-2 text-[13px] text-white">
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {t(key)}
          </li>
        ))}
      </ul>
      <Link
        href="/trust"
        className="inline-flex min-h-11 w-fit items-center text-[13px] font-semibold text-white underline underline-offset-4 hover:no-underline md:min-h-8"
      >
        {t("verifiedLink")}
      </Link>
    </div>
  );
}
