import { CalendarCheck, Search, Stethoscope, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const steps: { key: "find" | "book" | "consult"; icon: LucideIcon }[] = [
  { key: "find", icon: Search },
  { key: "book", icon: CalendarCheck },
  { key: "consult", icon: Stethoscope },
];

export function HowItWorks() {
  const t = useTranslations("howItWorks");
  return (
    <section aria-labelledby="how-title" className="panel p-4">
      <h2 id="how-title" className="mb-3 text-lg font-bold md:text-xl">
        {t("title")}
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map(({ key, icon: Icon }, i) => (
          <li key={key} className="flex gap-3 rounded-lg bg-tint-blue p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-panel">
              <Icon aria-hidden="true" className="size-5 text-brand-blue" />
            </span>
            <div>
              <h3 className="text-base font-semibold">
                <span className="text-brand-blue">{i + 1}. </span>
                {t(`${key}.title`)}
              </h3>
              <p className="text-sm text-body">{t(`${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
