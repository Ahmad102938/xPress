"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@acurexpress/ui";

const localeLabels: Record<Locale, { short: string; lang: string }> = {
  en: { short: "EN", lang: "en" },
  hi: { short: "हिन्दी", lang: "hi" },
};

/**
 * EN / हिन्दी switcher. Keeps the current page; switches only the locale prefix.
 * Query strings are not carried over yet (reading them would opt the static shell out of prerendering).
 */
export function LanguageSwitcher({
  tone = "default",
  className,
}: {
  tone?: "default" | "light";
  className?: string;
}) {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")} className={cn("flex items-center", className)}>
      <ul className="flex items-center">
        {routing.locales.map((code, i) => {
          const current = code === locale;
          return (
            <li key={code} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={tone === "light" ? "text-white/60" : "text-line"}
                >
                  |
                </span>
              )}
              <Link
                href={pathname}
                locale={code}
                lang={localeLabels[code].lang}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1.5 text-sm",
                  tone === "light"
                    ? current
                      ? "font-bold text-white underline underline-offset-4"
                      : "text-white/90 hover:text-white"
                    : current
                      ? "font-bold text-brand-blue underline underline-offset-4"
                      : "text-body hover:text-brand-blue",
                )}
              >
                {localeLabels[code].short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
