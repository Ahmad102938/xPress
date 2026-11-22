import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "@/i18n/messages/en.json";

/** Renders with the English messages, as components see them at runtime. */
export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
