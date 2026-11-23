import { uiMessages } from "@acurexpress/ui";
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";

const messages = { en: { ...uiMessages.en, ...en }, hi: { ...uiMessages.hi, ...hi } };

/** Renders with the app + shared UI messages, as components see them at runtime (English by default). */
export function renderWithIntl(
  ui: ReactElement,
  { locale = "en", ...options }: RenderOptions & { locale?: "en" | "hi" } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Kolkata">
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
