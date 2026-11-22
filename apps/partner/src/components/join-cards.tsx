import { Badge } from "@acurexpress/ui";
import { Building2, Stethoscope, Store, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const cards: readonly { key: "doctor" | "clinic" | "shop"; icon: LucideIcon }[] = [
  { key: "doctor", icon: Stethoscope },
  { key: "clinic", icon: Building2 },
  { key: "shop", icon: Store },
];

/** The three partner types. Placeholders only: no sign-up flow exists yet. */
export function JoinCards() {
  const t = useTranslations("landing");
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map(({ key, icon: Icon }) => (
        <li key={key} className="panel flex flex-col gap-3 p-5">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-lg bg-tint-blue text-brand-blue"
          >
            <Icon className="size-6" />
          </span>
          <h2 className="text-lg font-extrabold">{t(`cards.${key}.title`)}</h2>
          <p className="text-sm text-body">{t(`cards.${key}.body`)}</p>
          <Badge variant="cream" className="mt-auto w-fit">
            {t("comingSoon")}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
