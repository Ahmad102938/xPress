import {
  Baby,
  Building2,
  HeartPulse,
  LayoutGrid,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  Venus,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";
import type { SpecialitySlug } from "@/lib/mock";

type Tone = "blue" | "green" | "amber";

const tones: Record<Tone, string> = {
  blue: "bg-tint-blue text-brand-blue ring-brand-blue/20",
  green: "bg-tint-green text-green-ink ring-brand-green/20",
  amber: "bg-tint-cream text-warning ring-amber/40",
};

type Item =
  | {
      kind: "category";
      key: "consultOnline" | "clinicVisit" | "shopsNearMe" | "allSpecialities";
      href: string;
      icon: LucideIcon;
      tone: Tone;
      flag?: keyof Flags;
    }
  | { kind: "speciality"; slug: SpecialitySlug; icon: LucideIcon; tone: Tone };

const items: Item[] = [
  { kind: "category", key: "consultOnline", href: "/consult", icon: Video, tone: "blue" },
  {
    kind: "category",
    key: "clinicVisit",
    href: "/doctors?mode=clinic",
    icon: Building2,
    tone: "green",
  },
  { kind: "speciality", slug: "general-physician", icon: Stethoscope, tone: "blue" },
  { kind: "speciality", slug: "paediatrics", icon: Baby, tone: "amber" },
  { kind: "speciality", slug: "gynaecology", icon: Venus, tone: "green" },
  { kind: "speciality", slug: "dermatology", icon: Sparkles, tone: "blue" },
  { kind: "speciality", slug: "cardiology", icon: HeartPulse, tone: "amber" },
  { kind: "speciality", slug: "dental", icon: Smile, tone: "green" },
  {
    kind: "category",
    key: "shopsNearMe",
    href: "/shops",
    icon: Store,
    tone: "amber",
    flag: "shopNetwork",
  },
  {
    kind: "category",
    key: "allSpecialities",
    href: "/specialities",
    icon: LayoutGrid,
    tone: "blue",
  },
];

/** Round category strip under the header (marketplace pattern, §25 item 3). Blue/green/amber only. */
export function CategoryStrip({ flags }: { flags: Flags }) {
  const t = useTranslations("categories");
  const tSpeciality = useTranslations("specialities.names");
  const visible = items.filter(
    (item) => item.kind !== "category" || !item.flag || flags[item.flag],
  );

  return (
    <nav aria-label={t("label")} className="border-b border-line bg-panel">
      <ul className="scroller mx-auto max-w-7xl gap-1 px-2 py-2 md:justify-between md:px-4">
        {visible.map((item) => {
          const label = item.kind === "category" ? t(item.key) : tSpeciality(item.slug);
          const href =
            item.kind === "category"
              ? item.href
              : { pathname: "/doctors", query: { speciality: item.slug } };
          const Icon = item.icon;
          return (
            <li key={item.kind === "category" ? item.key : item.slug} className="w-21 shrink-0">
              <Link
                href={href}
                className="group flex flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 text-center"
              >
                <span
                  className={`flex size-14 items-center justify-center rounded-full ring-1 transition-transform group-hover:scale-105 ${tones[item.tone]}`}
                >
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <span className="text-[13px] leading-tight font-medium text-ink">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
