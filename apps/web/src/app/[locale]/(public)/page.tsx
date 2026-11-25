import { setRequestLocale } from "next-intl/server";
import { PublicHome } from "@/components/home/public-home";
import type { Locale } from "@/i18n/routing";

/** Signed-out Home: prerendered and cacheable; the proxy sends signed-in visitors to /home. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <PublicHome />;
}
