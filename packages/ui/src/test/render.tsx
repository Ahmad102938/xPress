import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { uiMessages } from "../messages";

/** Renders with the package's English strings, as components see them inside an app. */
export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={uiMessages.en} timeZone="Asia/Kolkata">
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
