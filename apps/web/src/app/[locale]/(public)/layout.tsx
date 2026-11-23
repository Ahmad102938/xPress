import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/layout/site-shell";
import type { Locale } from "@/i18n/routing";

/** Visitor pages: the shared shell (emergency bar, header, footer, bottom nav, sign-in drawer). */
export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <SiteShell>{children}</SiteShell>;
}
