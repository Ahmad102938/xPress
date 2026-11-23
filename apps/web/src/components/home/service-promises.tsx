import type { ComponentType, SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Flags } from "@acurexpress/core";
import {
  AuthenticShieldIcon,
  DeliveryTruckIcon,
  PriceTagIcon,
  SupportClockIcon,
} from "@/components/brand/promise-icons";
import {
  FREE_DELIVERY_THRESHOLD_INR,
  showStoreClaims,
  trustClaims,
  type TrustClaim,
  type TrustClaimIcon,
  type TrustClaimTone,
} from "@/config/trust-strip";
import { formatInr } from "@acurexpress/core";

const icons: Record<TrustClaimIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  truck: DeliveryTruckIcon,
  clock: SupportClockIcon,
  shield: AuthenticShieldIcon,
  tag: PriceTagIcon,
};

/** Icon colour on a matching soft tile. Decorative: the text carries the meaning. */
const tones: Record<TrustClaimTone, string> = {
  blue: "bg-tint-blue text-brand-blue",
  green: "bg-tint-green text-brand-green",
  navy: "bg-tint-blue-soft text-deep-blue ring-1 ring-tint-blue",
  red: "bg-tint-cream text-error",
};

interface ServicePromisesProps {
  /** Defaults to the config; props exist for tests and previews. */
  claims?: readonly TrustClaim[];
  show?: boolean;
  flags?: Flags;
}

/**
 * Store claims strip below the hero (config/trust-strip.ts, owner override). 2x2 on small
 * screens, 4 across from lg. Text is the source of meaning; icons are decorative.
 */
export function ServicePromises({
  claims = trustClaims,
  show = showStoreClaims,
  flags,
}: ServicePromisesProps = {}) {
  const t = useTranslations("promises");
  const locale = useLocale();
  const visible = claims.filter((claim) => !claim.requiresFlag || flags?.[claim.requiresFlag]);
  if (!show || visible.length === 0) return null;

  return (
    <section aria-label={t("label")} data-trust-strip="" className="panel px-3 py-3 md:px-4">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
        {visible.map(({ id, icon, tone, titleKey, subtitleKey }) => {
          const Icon = icons[icon];
          return (
            <li key={id} className="flex min-w-0 items-center gap-2.5 lg:justify-center lg:px-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl md:size-11 ${tones[tone]}`}
              >
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <p className="min-w-0 leading-tight">
                <span className="block text-sm font-bold text-ink md:text-[15px]">
                  {t(titleKey)}
                </span>
                <span className="block text-[13px] text-body">
                  {t(subtitleKey, { amount: formatInr(FREE_DELIVERY_THRESHOLD_INR, locale) })}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
