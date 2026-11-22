import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@acurexpress/ui";
import { Button } from "@acurexpress/ui";
import { getPathname, Link } from "@/i18n/navigation";
import type { Flags } from "@acurexpress/core";
import { sampleClinics, sampleDoctors, specialities } from "@/lib/mock";
import { LanguageSwitcher } from "./language-switcher";
import { LocationPicker } from "./location-picker";
import { SearchBar, type SearchSuggestionGroup } from "./search-bar";

async function buildSuggestionGroups(flags: Flags): Promise<SearchSuggestionGroup[]> {
  const locale = await getLocale();
  const t = await getTranslations("search");
  const tSpeciality = await getTranslations("specialities.names");
  const path = (href: Parameters<typeof getPathname>[0]["href"]) => getPathname({ href, locale });

  const groups: SearchSuggestionGroup[] = [
    {
      id: "specialities",
      label: t("groupSpecialities"),
      items: specialities.map((s) => ({
        id: `speciality-${s.slug}`,
        label: tSpeciality(s.slug),
        href: path({ pathname: "/doctors", query: { speciality: s.slug } }),
      })),
    },
    {
      id: "doctors",
      label: t("groupDoctors"),
      items: sampleDoctors.map((d) => ({
        id: d.id,
        label: d.name,
        href: path({ pathname: "/doctors", query: { q: d.name } }),
      })),
    },
    {
      id: "clinics",
      label: t("groupClinics"),
      items: sampleClinics.map((c) => ({
        id: c.id,
        label: c.name,
        href: path({ pathname: "/clinics", query: { q: c.name } }),
      })),
    },
  ];

  // Medicines appear in suggestions only when medicine sales are switched on (hard rule 11).
  if (flags.medicineSales) {
    groups.push({
      id: "medicines",
      label: t("groupMedicines"),
      items: [
        {
          id: "medicines-search",
          label: t("medicinesHint"),
          href: path("/medicines"),
          appendQuery: true,
          alwaysShow: true,
        },
      ],
    });
  }
  return groups;
}

export async function SiteHeader({ flags }: { flags: Flags }) {
  const t = await getTranslations("header");
  const locale = await getLocale();
  const groups = await buildSuggestionGroups(flags);
  const searchAction = getPathname({ href: "/doctors", locale });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 md:flex-nowrap md:gap-4">
        {/* Accessible name = visible logo text (+ tagline on large screens), WCAG 2.5.3. */}
        <Link href="/" className="inline-flex min-h-11 flex-col justify-center rounded-md">
          <Logo className="shrink-0" />
          <span className="hidden pl-8.5 text-[11px] leading-tight text-muted lg:block">
            {t("tagline")}
          </span>
        </Link>

        <LocationPicker id="header-location" className="order-3 md:order-none" />

        <SearchBar
          action={searchAction}
          groups={groups}
          includesMedicines={flags.medicineSales}
          className="order-4 min-w-0 flex-1 basis-[calc(100%-3.5rem)] md:order-none md:basis-auto"
        />

        <div className="order-2 ml-auto flex items-center gap-1 md:order-none md:ml-0">
          <LanguageSwitcher />
          <Link
            href="/for-doctors"
            className="hidden min-h-11 items-center rounded-md px-2 text-sm font-semibold text-deep-blue hover:text-brand-blue xl:inline-flex"
          >
            {t("becomePartner")}
          </Link>
          <Button asChild size="sm">
            <Link href="/login">
              <span className="sm:hidden">{t("loginShort")}</span>
              <span className="hidden sm:inline">{t("login")}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
