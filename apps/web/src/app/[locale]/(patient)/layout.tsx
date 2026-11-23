import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/layout/site-shell";
import type { Locale } from "@/i18n/routing";

/**
 * Signed-in patient area. Same shell as the public pages and NO auth logic here (R1-M13): every page
 * calls requirePatient() itself, inside its own <Suspense> boundary (cacheComponents is on).
 * Roles come from user_roles on the server, never from user_metadata.
 */
export default async function PatientLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <SiteShell>{children}</SiteShell>;
}
