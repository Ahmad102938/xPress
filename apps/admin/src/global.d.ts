import type { UiMessages } from "@acurexpress/ui";
import type messages from "@/i18n/messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "hi";
    // App strings plus the shared component strings from @acurexpress/ui (badges, rating).
    Messages: typeof messages & UiMessages;
  }
}
