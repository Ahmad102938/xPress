import { useTranslations } from "next-intl";
import { SpecialityTile } from "@/components/brand/speciality-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SPECIALITY_COUNT, specialities } from "@/lib/mock";

export function SpecialityGrid() {
  const t = useTranslations("specialities");
  return (
    <section aria-labelledby="specialities-title" className="panel p-4">
      <SectionHeader
        id="specialities-title"
        title={t("title")}
        subtitle={t("subtitle")}
        viewAllHref="/specialities"
      />
      <ul className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
        {specialities.slice(0, HOME_SPECIALITY_COUNT).map((s) => (
          <li key={s.slug}>
            <SpecialityTile slug={s.slug} />
          </li>
        ))}
      </ul>
    </section>
  );
}
