import { getTranslations } from "next-intl/server";
import { Logo } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

type FooterLink = { href: string; key: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "company",
    links: [
      { href: "/about", key: "about" },
      { href: "/contact", key: "contact" },
      { href: "/trust", key: "trust" },
    ],
  },
  {
    title: "legal",
    links: [
      { href: "/terms", key: "terms" },
      { href: "/privacy", key: "privacy" },
      { href: "/refund-policy", key: "refund" },
      { href: "/grievance", key: "grievance" },
    ],
  },
  {
    title: "partners",
    links: [
      { href: "/for-doctors", key: "forDoctors" },
      { href: "/for-clinics", key: "forClinics" },
      { href: "/for-shops", key: "forShops" },
    ],
  },
];

async function getCurrentYear() {
  "use cache";
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tCommon = await getTranslations("common");
  const year = await getCurrentYear();

  return (
    <footer className="focus-light bg-deep-blue text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link
              href="/"
              aria-label={tCommon("homeLink")}
              className="inline-flex min-h-11 items-center rounded-md"
            >
              <Logo tone="light" />
            </Link>
            <LanguageSwitcher tone="light" className="mt-3 -ml-1.5" />
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-labelledby={`footer-${column.title}`}>
              <h2 id={`footer-${column.title}`} className="text-base font-semibold text-white">
                {t(column.title as "company")}
              </h2>
              <ul className="mt-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm text-white/90 hover:text-white hover:underline"
                    >
                      {t(link.key as "about")}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* TODO(legal): placeholder wording. Final disclaimer text to be supplied and approved by HCQ Care. */}
        <p className="mt-8 rounded-md border border-white/30 p-3 text-sm text-white">
          {t("disclaimer")}
        </p>
        <p className="mt-4 text-[13px] text-white/80">{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
