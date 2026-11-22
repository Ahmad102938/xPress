import { uiMessages } from "@acurexpress/ui";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Asia/Kolkata",
    // Shared component strings first; app namespaces never reuse their names.
    messages: { ...uiMessages[locale], ...(await import(`./messages/${locale}.json`)).default },
  };
});
