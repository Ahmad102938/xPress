import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFlags } from "@acurexpress/core";
import { isStubAvailable, STUB_PAGES } from "@/config/stub-pages";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sitemap">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "sitemap" });
  return { title: t("title"), description: t("intro") };
}

const REAL_PAGES = [
  { href: "/login", key: "login" },
  { href: "/appointments", key: "appointments" },
  { href: "/account", key: "account" },
] as const;

/** Human-readable sitemap: only public pages that exist in this build (flag-off pages are left out). */
export default async function SitemapPage({ params }: PageProps<"/[locale]/sitemap">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("sitemap");
  const tPages = await getTranslations("pages");
  const flags = getFlags();
  const pages = STUB_PAGES.filter((page) => isStubAvailable(page, flags));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="panel p-6 md:p-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-body">{t("intro")}</p>
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-brand-blue underline-offset-4 hover:underline"
            >
              {t("home")}
            </Link>
          </li>
          {/* Real pages that used to be stubs (docs/specs/auth.md R2-N12). */}
          {REAL_PAGES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="inline-flex min-h-11 items-center text-brand-blue underline-offset-4 hover:underline"
              >
                {tPages(page.key)}
              </Link>
            </li>
          ))}
          {pages.map((page) => (
            <li key={page.path}>
              <Link
                href={`/${page.path}`}
                className="inline-flex min-h-11 items-center text-brand-blue underline-offset-4 hover:underline"
              >
                {tPages(page.key as "doctors")}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
