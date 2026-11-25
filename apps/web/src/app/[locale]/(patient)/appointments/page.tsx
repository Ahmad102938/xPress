import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button, cn } from "@acurexpress/ui";
import { requirePatient } from "@/features/auth/server/require-patient";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PrivatePage } from "../page-header";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/appointments">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "appointments" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const APPOINTMENT_TABS = ["upcoming", "past", "cancelled"] as const;
export type AppointmentTab = (typeof APPOINTMENT_TABS)[number];

/** A closed set: anything else is "upcoming". */
export function parseTab(value: unknown): AppointmentTab {
  return typeof value === "string" && (APPOINTMENT_TABS as readonly string[]).includes(value)
    ? (value as AppointmentTab)
    : "upcoming";
}

const EMPTY_KEY = {
  upcoming: "emptyUpcoming",
  past: "emptyPast",
  cancelled: "emptyCancelled",
} as const;

/** No booking tables yet: each tab shows its honest empty state (hard rule 7). */
async function AppointmentsContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/appointments">["searchParams"];
}) {
  await requirePatient("/appointments");
  const t = await getTranslations("appointments");
  const tab = parseTab((await searchParams).tab);
  return (
    <>
      <nav aria-label={t("tabsLabel")}>
        <ul className="flex gap-2 border-b border-line">
          {APPOINTMENT_TABS.map((value) => (
            <li key={value}>
              <Link
                href={{ pathname: "/appointments", query: { tab: value } }}
                aria-current={tab === value ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-3 font-semibold",
                  tab === value
                    ? "border-brand-blue text-brand-blue"
                    : "border-transparent text-body hover:text-ink",
                )}
              >
                {t(`tabs.${value}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="panel flex flex-col items-center gap-3 border border-line p-8 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-2xl bg-tint-blue text-brand-blue"
        >
          <CalendarCheck className="size-8" />
        </span>
        <p className="text-body">{t(EMPTY_KEY[tab])}</p>
        <Button asChild>
          <Link href="/doctors">{t("findDoctor")}</Link>
        </Button>
      </div>
    </>
  );
}

export default async function AppointmentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/appointments">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("appointments");
  return (
    <PrivatePage title={t("title")}>
      <Suspense fallback={<div className="panel min-h-48 border border-line" aria-busy="true" />}>
        <AppointmentsContent searchParams={searchParams} />
      </Suspense>
    </PrivatePage>
  );
}
