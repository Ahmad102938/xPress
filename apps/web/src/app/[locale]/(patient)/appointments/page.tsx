import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@acurexpress/ui";
import { requirePatient } from "@/features/auth/server/require-patient";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/appointments">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "appointments" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Placeholder until booking exists: no fabricated appointments (hard rule 7). */
async function AppointmentsContent() {
  await requirePatient("/appointments");
  const t = await getTranslations("appointments");
  return (
    <div className="panel flex flex-col items-center gap-3 p-8 text-center">
      <CalendarCheck aria-hidden="true" className="size-10 text-brand-blue" />
      <p className="text-body">{t("empty")}</p>
      <Button asChild>
        <Link href="/doctors">{t("findDoctor")}</Link>
      </Button>
    </div>
  );
}

export default async function AppointmentsPage({ params }: PageProps<"/[locale]/appointments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("appointments");
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{t("title")}</h1>
      <Suspense fallback={<div className="panel min-h-48" aria-busy="true" />}>
        <AppointmentsContent />
      </Suspense>
    </div>
  );
}
