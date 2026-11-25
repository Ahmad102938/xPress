import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "@/styles/globals.css";

// "optional": if Inter is not ready at first paint the size-adjusted fallback stays for that view,
// so text never re-renders late (keeps LCP at first paint and CLS at 0 on slow mobile networks).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
});

// Hindi glyphs. Only attached on Hindi pages: on English pages the single "हिन्दी" label in the
// language switcher uses the system Devanagari font instead of downloading ~200 KB of web font.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});

/** Only these namespaces are sent to the browser (client components). Keeps the payload small. */
const CLIENT_NAMESPACES = [
  "hero",
  "search",
  "header",
  "nav",
  "auth",
  "account",
  "location",
  // Signed-in experience (docs/specs/signed-in-home.md item 82)
  "signedIn",
  "family",
  "profile",
  "security",
  "reverify",
  "idle",
  "patientHome",
  "errors",
] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "en", namespace: "metadata" });
  return {
    title: { default: t("title"), template: "%s | A-CureXpress" },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#155DFC",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.map((namespace) => [namespace, messages[namespace]]),
  );

  return (
    // suppressHydrationWarning: an inline script may add data-emergency-dismissed before hydration.
    <html
      suppressHydrationWarning
      lang={locale}
      className={locale === "hi" ? `${inter.variable} ${devanagari.variable}` : inter.variable}
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
