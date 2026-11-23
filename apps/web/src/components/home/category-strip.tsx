import {
  Baby,
  Bot,
  Building2,
  HeartPulse,
  LayoutGrid,
  Pill,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  Venus,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Flags } from "@acurexpress/core";
import { Link } from "@/i18n/navigation";
import type { SpecialitySlug } from "@/lib/mock";

/*
 * Category strip under the header (§25 item 3), in two groups:
 * 1. Services as filled tiles. "Clinic visit" (building, green) and "Consult online" (video, blue)
 *    use the same icon and tint everywhere on the page, so the two choices never look alike.
 * 2. Specialities as round icons, after a divider.
 * Flag-off services are hidden, not greyed out.
 */

type ServiceKey = "consultOnline" | "clinicVisit" | "shopsNearMe" | "medicines" | "healthAssistant";

const services: {
  key: ServiceKey;
  href: string;
  icon: LucideIcon;
  tile: string;
  flag?: keyof Flags;
}[] = [
  {
    key: "consultOnline",
    href: "/consult",
    icon: Video,
    tile: "bg-tint-blue text-brand-blue ring-brand-blue/20 hover:ring-brand-blue/60",
  },
  {
    key: "clinicVisit",
    href: "/doctors?mode=clinic",
    icon: Building2,
    tile: "bg-tint-green text-green-ink ring-brand-green/25 hover:ring-brand-green/60",
  },
  {
    key: "shopsNearMe",
    href: "/shops",
    icon: Store,
    tile: "bg-tint-cream text-warning ring-amber/50 hover:ring-amber",
    flag: "shopNetwork",
  },
  {
    key: "medicines",
    href: "/medicines",
    icon: Pill,
    tile: "bg-tint-blue-soft text-deep-blue ring-deep-blue/20 hover:ring-deep-blue/50",
    flag: "medicineSales",
  },
  {
    key: "healthAssistant",
    href: "/health-assistant",
    icon: Bot,
    tile: "bg-tint-blue-soft text-deep-blue ring-deep-blue/20 hover:ring-deep-blue/50",
    flag: "aiConsultant",
  },
];

const circleTones = {
  blue: "bg-tint-blue text-brand-blue ring-brand-blue/30 group-hover:ring-brand-blue",
  green: "bg-tint-green text-green-ink ring-brand-green/30 group-hover:ring-brand-green",
  amber: "bg-tint-cream text-warning ring-amber/60 group-hover:ring-amber",
} as const;

const specialityItems: {
  slug: SpecialitySlug;
  icon: LucideIcon;
  tone: keyof typeof circleTones;
}[] = [
  { slug: "general-physician", icon: Stethoscope, tone: "blue" },
  { slug: "paediatrics", icon: Baby, tone: "amber" },
  { slug: "gynaecology", icon: Venus, tone: "green" },
  { slug: "dermatology", icon: Sparkles, tone: "blue" },
  { slug: "cardiology", icon: HeartPulse, tone: "amber" },
  { slug: "dental", icon: Smile, tone: "green" },
];

const pressable = "transition motion-safe:active:scale-[0.97]";

/*
 * Specialities: every item has the same fixed width (w-20) and its label wraps onto at most two
 * centred lines, so the circles are evenly spaced whatever the label length.
 */
function Circle({ icon: Icon, tone }: { icon: LucideIcon; tone: keyof typeof circleTones }) {
  return (
    <span
      className={`flex size-14 items-center justify-center rounded-full ring-2 transition motion-safe:group-hover:-translate-y-0.5 lg:size-11 ${circleTones[tone]}`}
    >
      <Icon aria-hidden="true" className="size-7 lg:size-5" strokeWidth={1.75} />
    </span>
  );
}

export function CategoryStrip({ flags }: { flags: Flags }) {
  const t = useTranslations("categories");
  const tSpeciality = useTranslations("specialities.names");
  const visibleServices = services.filter((service) => !service.flag || flags[service.flag]);

  return (
    <nav aria-label={t("label")} className="border-b border-line bg-panel">
      {/* Edge fade while the row scrolls sideways; from xl everything fits (also with the
          Medicines tile when medicine sales are on), so the fade is dropped there. */}
      <ul className="scroller mx-auto max-w-7xl items-center gap-2 [mask-image:linear-gradient(to_right,black_85%,transparent)] px-4 py-1.5 lg:gap-2.5 xl:justify-between xl:[mask-image:none]">
        {visibleServices.map(({ key, href, icon: Icon, tile }) => (
          <li key={key} className="shrink-0">
            <Link
              href={href}
              className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3.5 py-2 ring-1 hover:shadow-md lg:min-h-12 lg:gap-1.5 lg:px-2.5 ${pressable} ${tile}`}
            >
              {/* Two-tone icon: soft fill plus stroke. */}
              <Icon
                aria-hidden="true"
                className="size-7 shrink-0 lg:size-5"
                fill="currentColor"
                fillOpacity={0.16}
                strokeWidth={1.9}
              />
              <span className="text-sm font-bold whitespace-nowrap text-ink lg:text-[13px]">
                {t(key)}
              </span>
            </Link>
          </li>
        ))}
        {specialityItems.map(({ slug, icon, tone }, i) => (
          <li
            key={slug}
            className={`shrink-0 ${i === 0 ? "ml-1 border-l border-line pl-3 lg:ml-0 lg:pl-2.5" : ""}`}
          >
            <Link
              href={{ pathname: "/doctors", query: { speciality: slug } }}
              className={`group flex w-20 flex-col items-center gap-1 rounded-lg text-center ${pressable}`}
            >
              <Circle icon={icon} tone={tone} />
              <span className="line-clamp-2 min-h-[2lh] text-[13px] leading-tight font-medium text-balance text-ink">
                {tSpeciality(slug)}
              </span>
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link
            href="/specialities"
            className={`group flex w-20 flex-col items-center gap-1 rounded-lg text-center ${pressable}`}
          >
            <Circle icon={LayoutGrid} tone="blue" />
            <span className="line-clamp-2 min-h-[2lh] text-[13px] leading-tight font-medium text-balance text-ink">
              {t("allSpecialities")}
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
