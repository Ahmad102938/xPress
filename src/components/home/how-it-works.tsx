import { CalendarCheck, Search, Stethoscope, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const steps: { key: "find" | "book" | "consult"; icon: LucideIcon; tone: string }[] = [
  { key: "find", icon: Search, tone: "bg-brand-blue text-white" },
  { key: "book", icon: CalendarCheck, tone: "bg-brand-green text-white" },
  { key: "consult", icon: Stethoscope, tone: "bg-amber text-on-amber" },
];

export function HowItWorks() {
  const t = useTranslations("howItWorks");
  return (
    <section aria-labelledby="how-title" className="panel p-4 md:p-6">
      <h2 id="how-title" className="mb-4 text-lg font-extrabold md:text-xl">
        {t("title")}
      </h2>
      <ol className="grid gap-3 md:grid-cols-3 md:gap-6">
        {steps.map(({ key, icon: Icon, tone }, i) => (
          <li key={key} className="relative flex gap-3 rounded-lg bg-tint-blue-soft p-4">
            <span
              className={`relative flex size-12 shrink-0 items-center justify-center rounded-full shadow-md ${tone}`}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                {i + 1}
              </span>
            </span>
            <div>
              <h3 className="text-base font-bold">{t(`${key}.title`)}</h3>
              <p className="text-sm text-body">{t(`${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
