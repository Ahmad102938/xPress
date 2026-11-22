// Types the package's own useTranslations() calls when it is type-checked on its own. Apps type
// their messages as (app messages & UiMessages), so the same keys are checked there too.
import type en from "./messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
