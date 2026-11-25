import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { company, displayValue, showPlaceholders } from "@/config/company";
import { requirePatient } from "@/features/auth/server/require-patient";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Panel, PrivatePage } from "../page-header";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/support">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "support" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Help routes (docs/specs/signed-in-home.md item 55). No form and no ticket system yet. */
async function SupportContent() {
  await requirePatient("/support");
  const t = await getTranslations("support");
  const tEmergency = await getTranslations("emergency");
  const visible = showPlaceholders();
  const contacts = [
    { label: t("phone"), value: displayValue(company.support.phone, visible) },
    { label: t("email"), value: displayValue(company.support.email, visible) },
    { label: t("hours"), value: displayValue(company.support.hours, visible) },
  ].filter((row): row is { label: string; value: string } => row.value !== null);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <Panel id="topics" title={t("topicsTitle")}>
          <ul className="flex flex-col gap-3">
            <li>
              <Link
                href="/appointments"
                className="font-semibold text-brand-blue underline-offset-2 hover:underline"
              >
                {t("bookingHelp")}
              </Link>
              <p className="text-sm text-body">{t("bookingHelpBody")}</p>
            </li>
            <li>
              <Link
                href="/account"
                className="font-semibold text-brand-blue underline-offset-2 hover:underline"
              >
                {t("accountHelp")}
              </Link>
              <p className="text-sm text-body">{t("accountHelpBody")}</p>
            </li>
            <li>
              <Link
                href="/grievance"
                className="font-semibold text-brand-blue underline-offset-2 hover:underline"
              >
                {t("grievance")}
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
      <div className="flex flex-col gap-6 lg:col-span-5">
        <Panel id="emergency" title={t("emergencyTitle")}>
          <p className="text-ink">{tEmergency("message")}</p>
        </Panel>
        <Panel id="contact" title={t("contactTitle")}>
          {contacts.length ? (
            <dl className="flex flex-col gap-2">
              {contacts.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-2">
                  <dt className="font-semibold text-ink">{row.label}</dt>
                  <dd className="text-body">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-body">{t("notListed")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default async function SupportPage({ params }: PageProps<"/[locale]/support">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("support");
  return (
    <PrivatePage title={t("title")} intro={t("intro")}>
      <Suspense fallback={<div className="panel min-h-48 border border-line" aria-busy="true" />}>
        <SupportContent />
      </Suspense>
    </PrivatePage>
  );
}
