import {
  ArrowUpRight,
  Bot,
  Building2,
  Pill,
  Search,
  Store,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@acurexpress/core";

type ActionKey =
  "clinicVisit" | "onlineConsult" | "findDoctor" | "nearbyShops" | "medicines" | "healthAssistant";

interface QuickAction {
  key: ActionKey;
  href: string;
  icon: LucideIcon;
  /** Tile background + solid icon square. Brand colours only (blue, green, amber). */
  tile: string;
  square: string;
  /** Hidden (not greyed out) when the flag is off. */
  flag?: keyof Flags;
}

const actions: QuickAction[] = [
  {
    key: "clinicVisit",
    href: "/doctors?mode=clinic",
    icon: Building2,
    tile: "bg-tint-green",
    square: "bg-brand-green text-white",
  },
  {
    key: "onlineConsult",
    href: "/consult",
    icon: Video,
    tile: "bg-tint-blue",
    square: "bg-brand-blue text-white",
  },
  {
    key: "findDoctor",
    href: "/doctors",
    icon: Search,
    tile: "bg-tint-blue-soft",
    square: "bg-deep-blue text-white",
  },
  {
    key: "nearbyShops",
    href: "/shops",
    icon: Store,
    tile: "bg-tint-cream",
    square: "bg-amber text-on-amber",
    flag: "shopNetwork",
  },
  {
    key: "medicines",
    href: "/medicines",
    icon: Pill,
    tile: "bg-tint-green",
    square: "bg-brand-green text-white",
    flag: "medicineSales",
  },
  {
    key: "healthAssistant",
    href: "/health-assistant",
    icon: Bot,
    tile: "bg-tint-blue",
    square: "bg-brand-blue text-white",
    flag: "aiConsultant",
  },
];

export function QuickActions({ flags }: { flags: Flags }) {
  const t = useTranslations("quickActions");
  const visible = actions.filter((action) => !action.flag || flags[action.flag]);

  return (
    <section aria-labelledby="quick-actions-title" className="panel p-3 md:p-4">
      <h2 id="quick-actions-title" className="sr-only">
        {t("title")}
      </h2>
      <ul
        data-testid="quick-actions"
        className="scroller -mx-3 gap-3 px-3 md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:px-0"
      >
        {visible.map(({ key, href, icon: Icon, tile, square }) => (
          <li key={key} className="w-40 shrink-0 md:w-auto">
            <Link
              href={href}
              data-testid={`quick-action-${key}`}
              className={`group relative flex h-full min-h-32 flex-col gap-2 rounded-lg p-3 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md ${tile}`}
            >
              <ArrowUpRight
                aria-hidden="true"
                className="absolute top-3 right-3 size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
              <span
                className={`flex size-11 items-center justify-center rounded-xl shadow-sm ${square}`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="mt-1 text-[15px] leading-tight font-bold text-ink">
                {t(`${key}.label`)}
              </span>
              <span className="text-[13px] leading-snug text-body">{t(`${key}.helper`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
