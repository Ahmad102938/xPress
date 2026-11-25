"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@acurexpress/ui";

/** No notification data exists yet, so no badge and no count: an honest empty state. */
export function NotificationsBell() {
  const t = useTranslations("signedIn");
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("notifications")}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-tint-blue focus-visible:outline-2 focus-visible:outline-brand-blue"
      >
        <Bell aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent>
        <p className="font-semibold text-ink">{t("notifications")}</p>
        <p className="mt-1">{t("noNotifications")}</p>
      </PopoverContent>
    </Popover>
  );
}
