import type { ComponentType, SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AuthenticShieldIcon,
  DeliveryTruckIcon,
  PriceTagIcon,
  SupportClockIcon,
} from "@/components/brand/promise-icons";
import {
  FREE_DELIVERY_THRESHOLD_INR,
  servicePromises,
  type PromiseKey,
  type PromiseTone,
} from "@/config/service-promises";
import { formatInr } from "@acurexpress/core";

const icons: Record<PromiseKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  freeDelivery: DeliveryTruckIcon,
  support: SupportClockIcon,
  authentic: AuthenticShieldIcon,
  bestPrices: PriceTagIcon,
};

const tones: Record<PromiseTone, string> = {
  blue: "text-brand-blue",
  green: "text-brand-green",
  navy: "text-deep-blue",
  red: "text-error",
};

/** Quiet white strip of store promises with solid icons. Sits just below the hero carousel. */
export function ServicePromises() {
  const t = useTranslations("promises");
  const locale = useLocale();

  return (
    <section aria-label={t("label")} className="rounded-lg bg-panel py-4 md:py-5">
      {/* Swipeable on small screens; focusable so keyboard users can scroll it too. */}
      <ul
        tabIndex={0}
        aria-label={t("label")}
        className="scroller gap-8 px-5 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 sm:px-8 lg:grid-cols-4 lg:gap-4 lg:px-6"
      >
        {servicePromises.map(({ key, tone }) => {
          const Icon = icons[key];
          return (
            <li
              key={key}
              className="flex shrink-0 items-center gap-3 whitespace-nowrap sm:whitespace-normal lg:justify-center"
            >
              <Icon aria-hidden="true" className={`size-8 shrink-0 ${tones[tone]}`} />
              <p className="leading-snug">
                <span className="block text-[15px] font-semibold text-ink md:text-base">
                  {t(`${key}.title`)}
                </span>
                <span className="block text-sm text-muted">
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
