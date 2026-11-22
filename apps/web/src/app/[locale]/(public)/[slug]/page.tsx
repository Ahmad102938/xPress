import { Construction } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getFlags, type FlagName } from "@acurexpress/core";

/**
 * "Coming soon" stubs so no link on the site is dead. A real page at the same path (for example
 * src/app/[locale]/(public)/doctors/page.tsx) takes precedence over this dynamic route.
 */
const STUB_PAGES = [
  "doctors",
  "consult",
  "shops",
  "login",
  "trust",
  "about",
  "contact",
  "terms",
  "privacy",
  "refund-policy",
  "grievance",
  "for-doctors",
  "for-clinics",
  "for-shops",
  "specialities",
  "clinics",
  "account",
  "medicines",
  "health-assistant",
] as const;

type StubPage = (typeof STUB_PAGES)[number];

/** Stubs that exist only while their feature flag is on. */
const FLAGGED: Partial<Record<StubPage, FlagName>> = {
  shops: "shopNetwork",
  medicines: "medicineSales",
  "health-assistant": "aiConsultant",
};

function isAvailable(slug: string): slug is StubPage {
  if (!(STUB_PAGES as readonly string[]).includes(slug)) return false;
  const flag = FLAGGED[slug as StubPage];
  return !flag || getFlags()[flag];
}

// All stubs are prerendered, including flagged ones, so a flag-off page resolves to a real 404
// at build time instead of a streamed (status 200) not-found.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => STUB_PAGES.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAvailable(slug)) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages" });
  return { title: t(slug), robots: { index: false } };
}

export default async function ComingSoonPage({ params }: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await params;
  if (!isAvailable(slug)) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations("common");
  const tPages = await getTranslations("pages");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-tint-cream">
          <Construction aria-hidden="true" className="size-7 text-warning" />
        </span>
        <h1 className="text-2xl font-bold">{tPages(slug)}</h1>
        <p className="text-lg font-semibold text-ink">{t("comingSoon")}</p>
        <p className="text-body">{t("comingSoonBody")}</p>
        <Button asChild className="mt-2">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
