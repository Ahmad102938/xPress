import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@acurexpress/ui";

/**
 * SAMPLE LAYOUT ONLY. No fabricated reviews (hard rule 7). Real stories need patient consent and
 * HCQ review; until a review policy exists, feedback goes to HCQ only (open point G11).
 */
export function PatientStories() {
  const t = useTranslations("stories");
  const tCommon = useTranslations("common");
  return (
    <section aria-labelledby="stories-title" className="panel p-4" data-testid="stories-section">
      <h2 id="stories-title" className="text-lg font-bold md:text-xl">
        {t("title")}
      </h2>
      <p className="mb-3 text-sm text-muted">{t("subtitle")}</p>
      <ul className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <li key={n} className="rounded-lg border border-dashed border-[#94a3b8] p-3">
            <div className="flex items-center justify-between">
              <Quote aria-hidden="true" className="size-5 text-muted" />
              <Badge variant="warning">{tCommon("sampleBadge")}</Badge>
            </div>
            <p className="mt-2 text-sm text-body">{t("sampleText")}</p>
            <p className="mt-2 text-[13px] font-medium text-muted">{t("sampleAuthor")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
