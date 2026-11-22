import {
  BadgeCheck,
  Building2,
  CreditCard,
  Headset,
  Lock,
  ReceiptIndianRupee,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  FREE_DELIVERY_THRESHOLD_INR,
  PROMISE_STRIP_SIZE,
  servicePromises,
  type PromiseKey,
  type PromiseTone,
} from "@/config/service-promises";
import type { Flags } from "@/lib/flags";
import { formatInr } from "@/lib/utils";

const icons: Record<PromiseKey, LucideIcon> = {
  freeDelivery: Truck,
  support: Headset,
  licensedPharmacies: BadgeCheck,
  clearPricing: ReceiptIndianRupee,
  verifiedDoctors: ShieldCheck,
  clinicOrOnline: Building2,
  securePayments: CreditCard,
  privateRecords: Lock,
};

const tones: Record<PromiseTone, string> = {
  blue: "text-brand-blue",
  green: "text-brand-green",
  amber: "text-warning",
  navy: "text-deep-blue",
};

/** Slim strip of short, true promises (icon, title, one line). Sits just above the carousel. */
export function ServicePromises({ flags }: { flags: Flags }) {
  const t = useTranslations("promises");
  const locale = useLocale();
  const visible = servicePromises
    .filter((item) => !item.flag || (flags[item.flag] && item.confirmedByHcq))
    .slice(0, PROMISE_STRIP_SIZE);

  return (
    <section aria-label={t("label")} className="panel py-3 md:px-4">
      {/* Swipeable on small screens; focusable so keyboard users can scroll it too. */}
      <ul
        tabIndex={0}
        aria-label={t("label")}
        className="scroller gap-6 px-4 md:grid md:grid-cols-4 md:px-0"
      >
        {visible.map(({ key, tone }) => {
          const Icon = icons[key];
          return (
            <li
              key={key}
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap md:justify-center md:whitespace-normal"
            >
              <Icon
                aria-hidden="true"
                className={`size-7 shrink-0 ${tones[tone]}`}
                strokeWidth={2}
              />
              <p className="min-w-0 leading-tight">
                <span className="block text-sm font-bold text-ink md:text-base">
                  {t(`${key}.title`)}
                </span>
                <span className="block text-[13px] text-muted md:text-sm">
                  {t(`${key}.body`, { amount: formatInr(FREE_DELIVERY_THRESHOLD_INR, locale) })}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
