import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PartnerHeader } from "@/components/partner-header";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "optional" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: { default: t("title"), template: "%s | A-CureXpress partners" },
    description: t("description"),
    // Not indexed by default. Only the landing page (app/page.tsx) opts in.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#155DFC",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("header");
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        {/* No client components need strings yet, so no messages are sent to the browser. */}
        <NextIntlClientProvider messages={{}}>
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-panel px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          <PartnerHeader />
          <main id="main">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
