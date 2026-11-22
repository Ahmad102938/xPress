import { Logo } from "@acurexpress/ui";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "optional" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: { default: t("title"), template: "%s | A-CureXpress admin" },
    // Never indexed. Also enforced by robots.txt and the X-Robots-Tag header (next.config.ts).
    robots: { index: false, follow: false, nocache: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B1F5C",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("header");
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <NextIntlClientProvider messages={{}}>
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-panel px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          {/* Same bar as the patient site header, without public navigation. */}
          <header className="border-b border-line bg-panel">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
              <Logo className="shrink-0" />
              <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
                {t("badge")}
              </span>
            </div>
          </header>
          <main id="main">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
