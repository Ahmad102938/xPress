import { useTranslations } from "next-intl";
import { DoctorCard } from "@/components/brand/doctor-card";
import { SectionHeader } from "@/components/ui/section-header";
import { sampleDoctors } from "@/lib/mock";
import { SampleDataNote } from "./sample-data-note";

export function DoctorsRow() {
  const t = useTranslations("doctors");
  return (
    <section aria-labelledby="doctors-title" className="panel p-4" data-testid="doctors-section">
      <SectionHeader
        id="doctors-title"
        title={t("title")}
        subtitle={t("subtitle")}
        accent="green"
        viewAllHref="/doctors"
      />
      {/* Horizontal row; scrollable with touch, trackpad or keyboard (focusable region). */}
      <ul tabIndex={0} aria-labelledby="doctors-title" className="scroller -mx-4 gap-3 px-4 pb-1">
        {sampleDoctors.map((doctor) => (
          <li key={doctor.id} className="w-[17.5rem] shrink-0">
            <DoctorCard doctor={doctor} />
          </li>
        ))}
      </ul>
      <SampleDataNote />
    </section>
  );
}
