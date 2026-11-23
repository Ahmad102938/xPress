import { SectionHeader } from "@/components/ui/section-header";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const questions = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

/** FAQ accordion built on native <details>/<summary>: keyboard and screen-reader support, no JS. */
export function Faq() {
  const t = useTranslations("faq");
  return (
    <section aria-labelledby="faq-title" className="panel p-4 md:p-6">
      <SectionHeader id="faq-title" title={t("title")} accent="navy" className="mb-1" />
      <div className="divide-y divide-line">
        {questions.map((key) => (
          <details key={key} name="faq" className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
              {t(`items.${key}.q`)}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 text-sm text-body">{t(`items.${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
