import { Construction } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFlags } from "@acurexpress/core";
import { Button } from "@acurexpress/ui";
import { findStub, isStubAvailable, STUB_PAGES, type StubPage } from "@/config/stub-pages";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * "Coming soon" stubs so no link on the site is dead (list: src/config/stub-pages.ts). A real page
 * at the same path (for example (public)/doctors/page.tsx) takes precedence over this catch-all.
 */
function availableStub(slug: string[]): StubPage | null {
  const page = findStub(slug.join("/"));
  return page && isStubAvailable(page, getFlags()) ? page : null;
}

// All stubs are prerendered, including flagged ones, so a flag-off page resolves to a real 404
// at build time instead of a streamed (status 200) not-found.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    STUB_PAGES.map((page) => ({ locale, slug: page.path.split("/") })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[...slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = availableStub(slug);
  if (!page) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: "pages" });
  const tCommon = await getTranslations({ locale: locale as Locale, namespace: "common" });
  return {
    title: t(page.key as "doctors"),
    description: tCommon("comingSoonBody"),
    robots: { index: false },
  };
}

export default async function ComingSoonPage({ params }: PageProps<"/[locale]/[...slug]">) {
  const { locale, slug } = await params;
  const page = availableStub(slug);
  if (!page) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations("common");
  const tPages = await getTranslations("pages");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-tint-cream">
          <Construction aria-hidden="true" className="size-7 text-warning" />
        </span>
        <h1 className="text-2xl font-bold">{tPages(page.key as "doctors")}</h1>
        <p className="text-lg font-semibold text-ink">{t("comingSoon")}</p>
        <p className="text-body">{t("comingSoonBody")}</p>
        {page.legal && (
          <p className="rounded-md bg-warning-bg px-3 py-2 text-sm font-semibold text-warning">
            {t("legalPending")}
          </p>
        )}
        <Button asChild className="mt-2">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
