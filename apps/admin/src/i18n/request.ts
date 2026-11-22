import { uiMessages } from "@acurexpress/ui";
import { getRequestConfig } from "next-intl/server";
import en from "./messages/en.json";

// English only for now (no locale routing yet). hi.json is kept in step with en.json so Hindi can
// be switched on later without missing keys. TODO(i18n): add [locale] routing like apps/web.
export default getRequestConfig(async () => ({
  locale: "en",
  timeZone: "Asia/Kolkata",
  messages: { ...uiMessages.en, ...en },
}));
