import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmergencyBar } from "@/components/layout/emergency-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { Locale } from "@/i18n/routing";
import { getFlags } from "@acurexpress/core";

/** Shared shell for visitor pages: emergency bar, sticky header, footer, mobile bottom nav. */
export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("common");
  const tEmergency = await getTranslations("emergency");
  const flags = getFlags();

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-panel px-4 py-3 font-semibold text-brand-blue focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("skipToContent")}
      </a>
      <EmergencyBar message={tEmergency("message")} dismissLabel={tEmergency("dismiss")} />
      <SiteHeader flags={flags} />
      <main id="main" className="pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      {/* Spacer so the fixed bottom nav never covers the footer on small screens. */}
      <div aria-hidden="true" className="h-16 md:hidden" />
      <MobileBottomNav showShops={flags.shopNetwork} />
    </>
  );
}
