import { ArrowRight, Building2, Stethoscope, Store, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Flags } from "@/lib/flags";

type Key = "doctor" | "clinic" | "shop";

const cards: {
  key: Key;
  href: string;
  icon: LucideIcon;
  tile: string;
  square: string;
  flag?: keyof Flags;
}[] = [
  {
    key: "doctor",
    href: "/for-doctors",
    icon: Stethoscope,
    tile: "bg-tint-blue",
    square: "bg-brand-blue text-white",
  },
  {
    key: "clinic",
    href: "/for-clinics",
    icon: Building2,
    tile: "bg-tint-green",
    square: "bg-brand-green text-white",
  },
  {
    key: "shop",
    href: "/for-shops",
    icon: Store,
    tile: "bg-tint-cream",
    square: "bg-amber text-on-amber",
    flag: "shopNetwork",
  },
];

/** Partner acquisition band (§25 item 15): doctors, clinics, medical shops. */
export function JoinUs({ flags }: { flags: Flags }) {
  const t = useTranslations("joinUs");
  const visible = cards.filter((card) => !card.flag || flags[card.flag]);
  return (
    <section aria-labelledby="join-title" className="panel p-4 md:p-6">
      <h2 id="join-title" className="text-center text-lg font-extrabold md:text-2xl">
        {t("title")}
      </h2>
      <p className="mt-1 text-center text-sm text-muted">{t("subtitle")}</p>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {visible.map(({ key, href, icon: Icon, tile, square }) => (
          <li
            key={key}
            className={`flex flex-col gap-3 rounded-lg p-4 ring-1 ring-black/5 ${tile}`}
          >
            <span
              className={`flex size-12 items-center justify-center rounded-xl shadow-sm ${square}`}
            >
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h3 className="text-base font-bold">{t(`${key}.title`)}</h3>
            <p className="flex-1 text-sm text-body">{t(`${key}.body`)}</p>
            <Button asChild variant="primary" className="w-full">
              <Link href={href}>
                {t(`${key}.cta`)}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
