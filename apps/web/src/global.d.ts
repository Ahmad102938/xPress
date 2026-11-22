import type { UiMessages } from "@acurexpress/ui";
import type { Locale } from "@/i18n/routing";
import type messages from "@/i18n/messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    // App strings plus the shared component strings from @acurexpress/ui (badges, rating).
    Messages: typeof messages & UiMessages;
  }
}
