import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClinicsRow } from "@/components/home/clinics-row";
import { DoctorsRow } from "@/components/home/doctors-row";
import { Faq } from "@/components/home/faq";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { HowItWorks } from "@/components/home/how-it-works";
import { PatientStories } from "@/components/home/patient-stories";
import { AiPromo, ConsultPromo } from "@/components/home/promo-bands";
import { QuickActions } from "@/components/home/quick-actions";
import { ShopMapTeaser } from "@/components/home/shop-map-teaser";
import { SpecialityGrid } from "@/components/home/speciality-grid";
import { TrustStrip } from "@/components/home/trust-strip";
import { WhyTrust } from "@/components/home/why-trust";
import type { Locale } from "@/i18n/routing";
import { getFlags } from "@/lib/flags";

/**
 * Signed-out Home. Discovery page, not a product grid. All data is typed mock data (src/lib/mock).
 * TODO(db): swap mocks for public views once doctor/clinic/shop tables exist.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("metadata");
  const flags = getFlags();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:gap-6 md:py-6">
      <h1 className="sr-only">{t("title")}</h1>
      <QuickActions flags={flags} />
      <HeroCarousel flags={flags} />
      <TrustStrip />
      <SpecialityGrid />
      <DoctorsRow />
      <ClinicsRow />
      {flags.shopNetwork && <ShopMapTeaser />}
      <HowItWorks />
      <WhyTrust />
      <ConsultPromo flags={flags} />
      {flags.aiConsultant && <AiPromo />}
      <PatientStories />
      <Faq />
    </div>
  );
}
