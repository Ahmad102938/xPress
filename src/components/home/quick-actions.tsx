import { Bot, Building2, Pill, Search, Store, Video, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";

type ActionKey =
  "clinicVisit" | "onlineConsult" | "findDoctor" | "nearbyShops" | "medicines" | "healthAssistant";

interface QuickAction {
  key: ActionKey;
  href: string;
  icon: LucideIcon;
  tint: string;
  /** Hidden (not greyed out) when the flag is off. */
  flag?: keyof Flags;
}

const actions: QuickAction[] = [
  {
    key: "clinicVisit",
    href: "/doctors?mode=clinic",
    icon: Building2,
    tint: "bg-tint-green text-brand-green",
  },
  { key: "onlineConsult", href: "/consult", icon: Video, tint: "bg-tint-blue text-brand-blue" },
  { key: "findDoctor", href: "/doctors", icon: Search, tint: "bg-tint-blue text-brand-blue" },
  {
    key: "nearbyShops",
    href: "/shops",
    icon: Store,
    tint: "bg-tint-cream text-warning",
    flag: "shopNetwork",
  },
  {
    key: "medicines",
    href: "/medicines",
    icon: Pill,
    tint: "bg-tint-green text-brand-green",
    flag: "medicineSales",
  },
  {
    key: "healthAssistant",
    href: "/health-assistant",
    icon: Bot,
    tint: "bg-tint-blue text-brand-blue",
    flag: "aiConsultant",
  },
];

export function QuickActions({ flags }: { flags: Flags }) {
  const t = useTranslations("quickActions");
  const visible = actions.filter((action) => !action.flag || flags[action.flag]);

  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="sr-only">
        {t("title")}
      </h2>
      <ul
        data-testid="quick-actions"
        className="scroller -mx-4 gap-3 px-4 md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:px-0"
      >
        {visible.map(({ key, href, icon: Icon, tint }) => (
          <li key={key} className="w-36 shrink-0 md:w-auto">
            <Link
              href={href}
              data-testid={`quick-action-${key}`}
              className="panel flex h-full min-h-28 flex-col gap-2 border border-line p-3 transition-colors hover:border-brand-blue"
            >
              <span className={`flex size-10 items-center justify-center rounded-lg ${tint}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="text-sm leading-tight font-semibold text-ink">
                {t(`${key}.label`)}
              </span>
              <span className="text-[13px] leading-snug text-muted">{t(`${key}.helper`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
