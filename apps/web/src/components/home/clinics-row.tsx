import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClinicCard } from "@/components/brand/clinic-card";
import { SectionHeader } from "@/components/ui/section-header";
import { sampleClinics } from "@/lib/mock";
import { SampleDataNote } from "./sample-data-note";

export function ClinicsRow() {
  const t = useTranslations("clinics");
  return (
    <section aria-labelledby="clinics-title" className="panel p-4" data-testid="clinics-section">
      <SectionHeader
        id="clinics-title"
        title={t("title")}
        subtitle={t("subtitle")}
        icon={Building2}
        iconClassName="bg-amber text-on-amber"
        viewAllHref="/clinics"
      />
      <ul
        tabIndex={0}
        aria-labelledby="clinics-title"
        className="scroller -mx-4 gap-3 px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0"
      >
        {sampleClinics.map((clinic) => (
          <li key={clinic.id} className="w-64 shrink-0 lg:w-auto">
            <ClinicCard clinic={clinic} />
          </li>
        ))}
      </ul>
      <SampleDataNote />
    </section>
  );
}
